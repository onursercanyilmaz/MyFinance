const fs = require('fs');
let content = fs.readFileSync('components/dashboard.tsx', 'utf8');

content = content.replace('                    </span>\n                </Card>', '                    </span>\n                  </div>\n                </Card>');
fs.writeFileSync('components/dashboard.tsx', content);
