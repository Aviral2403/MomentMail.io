// /* eslint-disable react/prop-types */
// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import { leadAPI } from "../../api";
// import "./LeadsTable.css";

// const LeadRow = ({ lead, index, onSave }) => {
//   const [tags, setTags] = useState(lead.tags || "");
//   const [notes, setNotes] = useState(lead.notes || "");
  
//   return (
//     <tr>
//       <td>{lead.name || "-"}</td>
//       <td>
//         {lead.website ? (
//           <a href={lead.website} target="_blank" rel="noreferrer">
//             {lead.website}
//           </a>
//         ) : (
//           "-"
//         )}
//       </td>
//       <td>{(lead.emails || []).join(", ") || "-"}</td>
//       <td>{(lead.phones || []).join(", ") || "-"}</td>
//       <td>
//         <input
//           type="text"
//           value={tags}
//           onChange={(e) => setTags(e.target.value)}
//           placeholder="comma,separated"
//         />
//       </td>
//       <td>
//         <input
//           type="text"
//           value={notes}
//           onChange={(e) => setNotes(e.target.value)}
//           placeholder="Add notes"
//         />
//       </td>
//       <td>
//         <button
//           className="lg-btn lg-btn--primary"
//           onClick={() => onSave({ tags, notes })}
//         >
//           Save
//         </button>
//       </td>
//     </tr>
//   );
// };

// const LeadsTable = () => {
//   const { searchId } = useParams();
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
  
//   const fetchResults = async () => {
//     try {
//       const response = await leadAPI.getSearchDetail(searchId);
//       if (response.error) throw new Error(response.error);
//       setResults(response.contacts || []);
//     } catch (err) {
//       setError(err.message || "Error fetching leads");
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   const updateLead = async (index, updates) => {
//     try {
//       await leadAPI.updateContact(searchId, index, updates);
//       setResults((prev) =>
//         prev.map((r, i) => (i === index ? { ...r, ...updates } : r))
//       );
//     } catch (err) {
//       alert("Error updating lead: " + err.message);
//     }
//   };
  
//   useEffect(() => {
//     fetchResults();
//   }, [searchId]);
  
//   return (
//     <main className="lg-leads">
//       <h1>Search Leads</h1>
//       {loading && <p>Loading...</p>}
//       {error && <p className="lg-leads__error">{error}</p>}
//       {!loading && !error && (
//         <table className="lg-leads__table">
//           <thead>
//             <tr>
//               <th>Name</th>
//               <th>Website</th>
//               <th>Emails</th>
//               <th>Phones</th>
//               <th>Tags</th>
//               <th>Notes</th>
//               <th>Save</th>
//             </tr>
//           </thead>
//           <tbody>
//             {results.map((r, i) => (
//               <LeadRow
//                 key={i}
//                 lead={r}
//                 index={i}
//                 onSave={(updates) => updateLead(i, updates)}
//               />
//             ))}
//           </tbody>
//         </table>
//       )}
//     </main>
//   );
// };

// export default LeadsTable;