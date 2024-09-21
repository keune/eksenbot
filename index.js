const {checkAndPost} = require('./eksenbot');

(async () => {
  await checkAndPost();
  process.exit();
})();
