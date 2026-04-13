const http = require('http');
http.get('http://localhost:3000/', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    // parse out standard href links starting with /
    const regex = /href=(['"])((\/[^'"]+){3,})\1/g;
    let match;
    const links = [];
    while ((match = regex.exec(body)) !== null) {
      links.push(match[2]);
    }
    if (links.length === 0) {
        console.log('No links found');
        return;
    }
    const sample = links.slice(0, 5);
    console.log('Links:', sample);
    
    sample.forEach(link => {
       http.get('http://localhost:3000' + link, (pageRes) => {
          let pageBody = '';
          pageRes.on('data', c => pageBody += c);
          pageRes.on('end', () => {
             const titleMatch = pageBody.match(/<title>(.*?)<\/title>/);
             console.log(link, '->', titleMatch ? titleMatch[1] : 'No Title');
          });
       });
    });
  });
});
