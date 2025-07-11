const EmailTemplate = require('../models/EmailTemplate');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// ENHANCED: Better URL processing for Cloudinary images
const processHtmlImages = (html) => {
  if (!html) return html;
  
  console.log('=== PROCESSING HTML IMAGES ===');
  
  // Replace any non-secure cloudinary URLs with secure ones
  let processedHtml = html.replace(/http:\/\/res\.cloudinary\.com/g, 'https://res.cloudinary.com');
  
  // Check for any Unlayer URLs and log them for debugging
  const unlayerUrls = html.match(/https?:\/\/assets\.unlayer\.com[^\s"']+/g);
  if (unlayerUrls) {
    console.log('⚠️  Found Unlayer URLs in HTML:', unlayerUrls);
    console.log('This indicates the custom image upload callback is not working properly');
  }
  
  // Check for Cloudinary URLs
  const cloudinaryUrls = processedHtml.match(/https?:\/\/res\.cloudinary\.com[^\s"']+/g);
  if (cloudinaryUrls) {
    console.log('✅ Found Cloudinary URLs in HTML:', cloudinaryUrls);
  }
  
  console.log('HTML processing complete');
  return processedHtml;
};

// ENHANCED: Content processing to check for image sources
const processContentImages = (content) => {
  if (!content || typeof content !== 'object') return content;
  
  console.log('=== PROCESSING CONTENT IMAGES ===');
  
  const processedContent = JSON.parse(JSON.stringify(content));
  
  // Recursively search for image sources in the content structure
  const findImageSources = (obj) => {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      if (key === 'src' && typeof obj[key] === 'object' && obj[key].url) {
        console.log('Found image source:', obj[key].url);
        
        if (obj[key].url.includes('assets.unlayer.com')) {
          console.log('⚠️  Unlayer image detected in content structure');
        } else if (obj[key].url.includes('res.cloudinary.com')) {
          console.log('✅ Cloudinary image detected in content structure');
        }
      } else if (typeof obj[key] === 'object') {
        findImageSources(obj[key]);
      }
    }
  };
  
  findImageSources(processedContent);
  return processedContent;
};

// Save template
exports.saveTemplate = async (req, res) => {
  console.log('=== SAVING TEMPLATE ===');
  try {
    const { name, subject, description, content, html, tags, isPublic } = req.body;
    const user = req.user;

    console.log('Received template data:', {
      name,
      subject,
      description: description?.length,
      content: content ? 'exists' : 'missing',
      html: html?.length,
      tags,
      isPublic
    });

    if (!name || !subject || !content || !html) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Process both HTML and content for image sources
    const processedHtml = processHtmlImages(html);
    const processedContent = processContentImages(content);

    const template = new EmailTemplate({
      userId: user._id,
      name,
      subject,
      description,
      content: processedContent,
      html: processedHtml,
      tags: tags || [],
      isPublic: isPublic || false
    });

    await template.save();
    console.log('✅ Template saved successfully:', template.templateId);

    res.status(201).json({
      message: 'Template saved successfully',
      template: {
        id: template.templateId,
        name: template.name,
        subject: template.subject,
        description: template.description,
        html: template.html,
        createdAt: template.createdAt,
        tags: template.tags,
        isPublic: template.isPublic
      }
    });
  } catch (err) {
    console.error('❌ Error saving template:', err);
    res.status(500).json({
      message: 'Failed to save template',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get all templates for user
exports.getUserTemplates = async (req, res) => {
  console.log('=== FETCHING USER TEMPLATES ===');
  try {
    const user = req.user;
    const templates = await EmailTemplate.findByUserId(user._id);

    console.log('Found templates:', templates.length);
    templates.forEach(t => {
      const hasCloudinaryImages = t.html?.includes('res.cloudinary.com') || false;
      const hasUnlayerImages = t.html?.includes('assets.unlayer.com') || false;
      
      console.log(`Template ${t.templateId}:`, {
        name: t.name,
        htmlLength: t.html?.length,
        hasContent: !!t.content,
        hasCloudinaryImages,
        hasUnlayerImages
      });
      
      if (hasUnlayerImages) {
        console.log('⚠️  Template contains Unlayer images - custom upload may not be working');
      }
    });

    res.status(200).json({
      message: 'Templates retrieved successfully',
      templates: templates.map(t => ({
        id: t.templateId,
        name: t.name,
        subject: t.subject,
        description: t.description,
        html: t.html,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        tags: t.tags,
        isPublic: t.isPublic
      }))
    });
  } catch (err) {
    console.error('❌ Error getting templates:', err);
    res.status(500).json({
      message: 'Failed to get templates',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get single template
exports.getTemplate = async (req, res) => {
  console.log('=== FETCHING SINGLE TEMPLATE ===', req.params.templateId);
  try {
    const { templateId } = req.params;
    const user = req.user;

    const template = await EmailTemplate.findByTemplateIdAndUser(templateId, user._id);
    if (!template) {
      console.log('❌ Template not found:', templateId);
      return res.status(404).json({ message: 'Template not found' });
    }

    const hasCloudinaryImages = template.html?.includes('res.cloudinary.com') || false;
    const hasUnlayerImages = template.html?.includes('assets.unlayer.com') || false;

    console.log('✅ Found template:', {
      id: template.templateId,
      name: template.name,
      htmlLength: template.html?.length,
      content: template.content ? 'exists' : 'missing',
      hasCloudinaryImages,
      hasUnlayerImages
    });

    res.status(200).json({
      message: 'Template retrieved successfully',
      template: {
        id: template.templateId,
        name: template.name,
        subject: template.subject,
        description: template.description,
        content: template.content,
        html: template.html,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        tags: template.tags,
        isPublic: template.isPublic
      }
    });
  } catch (err) {
    console.error('❌ Error getting template:', err);
    res.status(500).json({
      message: 'Failed to get template',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update template
exports.updateTemplate = async (req, res) => {
  console.log('=== UPDATING TEMPLATE ===', req.params.templateId);
  try {
    const { templateId } = req.params;
    const { name, subject, description, content, html, tags, isPublic } = req.body;
    const user = req.user;

    console.log('Update data received:', {
      name,
      subject,
      description: description?.length,
      content: content ? 'exists' : 'missing',
      html: html?.length,
      tags,
      isPublic
    });

    const template = await EmailTemplate.findByTemplateIdAndUser(templateId, user._id);
    if (!template) {
      console.log('❌ Template not found for update:', templateId);
      return res.status(404).json({ message: 'Template not found' });
    }

    // Process HTML and content if provided
    const processedHtml = html ? processHtmlImages(html) : template.html;
    const processedContent = content ? processContentImages(content) : template.content;

    template.name = name || template.name;
    template.subject = subject || template.subject;
    template.description = description || template.description;
    template.content = processedContent;
    template.html = processedHtml;
    template.tags = tags || template.tags;
    template.isPublic = isPublic !== undefined ? isPublic : template.isPublic;

    await template.save();
    console.log('✅ Template updated successfully:', templateId);

    res.status(200).json({
      message: 'Template updated successfully',
      template: {
        id: template.templateId,
        name: template.name,
        subject: template.subject,
        description: template.description,
        html: template.html,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        tags: template.tags,
        isPublic: template.isPublic
      }
    });
  } catch (err) {
    console.error('❌ Error updating template:', err);
    res.status(500).json({
      message: 'Failed to update template',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  console.log('=== DELETING TEMPLATE ===', req.params.templateId);
  try {
    const { templateId } = req.params;
    const user = req.user;

    const template = await EmailTemplate.findOneAndDelete({ 
      templateId, 
      userId: user._id 
    });

    if (!template) {
      console.log('❌ Template not found for deletion:', templateId);
      return res.status(404).json({ message: 'Template not found' });
    }

    console.log('✅ Template deleted successfully:', templateId);
    res.status(200).json({
      message: 'Template deleted successfully'
    });
  } catch (err) {
    console.error('❌ Error deleting template:', err);
    res.status(500).json({
      message: 'Failed to delete template',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ENHANCED: Better error handling for image uploads
exports.uploadImage = async (req, res) => {
  console.log('=== UPLOADING IMAGE TO CLOUDINARY ===');
  try {
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File received:', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    });

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'email_templates/images',
      resource_type: 'auto',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    console.log('✅ Cloudinary upload successful:', {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    });

    res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    });
  } catch (err) {
    console.error('❌ Error uploading image:', err);
    res.status(500).json({
      message: 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// Direct Cloudinary upload for react-email-editor
exports.uploadImageDirect = async (req, res) => {
  console.log('Direct image upload to Cloudinary...'); // Debug
  try {
    const { image } = req.body;
    
    if (!image) {
      console.log('No image data provided'); // Debug
      return res.status(400).json({ message: 'No image data provided' });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: 'email_templates/images',
      resource_type: 'auto',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    console.log('Direct upload successful:', result.secure_url); // Debug
    res.status(200).json({
      url: result.secure_url
    });
  } catch (err) {
    console.error('Error in direct image upload:', err); // Debug
    res.status(500).json({
      message: 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};