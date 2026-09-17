const fs = require('fs');
let content = fs.readFileSync('components/month-detail.tsx', 'utf8');

content = content.replace('{/* Mobil Görünüm (Kartlar) */}', '<>\n          {/* Mobil Görünüm (Kartlar) */}');
content = content.replace('</table>\n          </div>\n        )}\n      </CardContent>', '</table>\n          </div>\n          </>\n        )}\n      </CardContent>');

fs.writeFileSync('components/month-detail.tsx', content);
