const fs = require('fs');
let c = fs.readFileSync('src/app/(dashboard)/layout.tsx', 'utf8');

c = c.replace(/Facturaci\ufffd\ufffdn/g, 'Facturación');
c = c.replace(/\ufffd\ufffdlapiel/g, 'Élapiel');
c = c.replace(/Bit\ufffd\ufffdcora/g, 'Bitácora');
c = c.replace(/Automatizaci\ufffd\ufffdn/g, 'Automatización');

// We also must cover the literal output we saw which was `??lapiel`
c = c.replace(/\?\?lapiel/g, 'Élapiel');
c = c.replace(/Facturaci\?\?n/g, 'Facturación');
c = c.replace(/Bit\?\?cora/g, 'Bitácora');
c = c.replace(/Automatizaci\?\?n/g, 'Automatización');

fs.writeFileSync('src/app/(dashboard)/layout.tsx', c);
