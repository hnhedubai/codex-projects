/** A top-level browser visit is not a cross-origin API/data read.
 * Keep the local Host boundary and allow only exact app entry documents.
 * Scripts, data, exports, frames, prefetches and mutations never use this exception.
 */
export function localDocumentNavigation(req,pathname,entryPages){
 const port=req.socket?.localPort||8181;
 if(![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host))return false;
 return ['GET','HEAD'].includes(req.method)&&entryPages.has(pathname)&&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document';
}
