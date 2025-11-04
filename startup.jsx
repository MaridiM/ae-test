(function () {
  var proj = "G:/Job/test/\u0422\u0417/TZ Collect/\u0422\u0417 JS.aep";
  var main = "G:/Job/test/\u0422\u0417/TZ Collect/scripts/main.jsx";

  var f = new File(proj);
  if (!f.exists) {
    f = File.openDialog("Select AEP", "*.aep");
    if (!f) {
      alert("Project not found");
      return;
    }
  }

  app.open(f);
  $.sleep(800);

  var ms = new File(main);
  if (!ms.exists) {
    ms = File.openDialog("Select main.jsx", "*.jsx");
    if (!ms) {
      alert("main.jsx not found");
      return;
    }
  }

  $.evalFile(ms);
})();
