try {
  require('./index.js');
} catch(e) {
  require('fs').writeFileSync('err.txt', e.stack);
}
