var Modifier = (function () {
  // Функция замены текста (она уже работает отлично)
  function replaceAllText(comp, newText) {
    Utils.log("Замена текста в композиции: " + comp.name);
    var changedCount = 0;
    for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);
      if (layer.property("Source Text")) {
        try {
          var textProp = layer.property("Source Text");
          var textDocument = textProp.value;
          Utils.log("  Изменение текста в слое: " + layer.name);
          Utils.log('    Было: "' + textDocument.text + '"');
          textDocument.text = newText;
          textProp.setValue(textDocument);
          Utils.log('    Стало: "' + newText + '"');
          changedCount++;
        } catch (e) {
          Utils.log(
            "    Ошибка изменения текста в слое " +
              layer.name +
              ": " +
              e.toString(),
            "ERROR"
          );
        }
      }
    }
    return changedCount;
  }

  // =========================================================
  // ИСПРАВЛЕННАЯ ВЕРСИЯ ФУНКЦИИ ЗАМЕНЫ ВИДЕО
  // =========================================================
  function replaceVideosInPrecomps(precomps) {
    Utils.log("Замена видео в прекомпозициях...");
    var replacedCount = 0;

    if (!precomps || precomps.length === 0) {
      Utils.log("  Не найдено прекомпозиций для замены видео.", "WARN");
      return 0;
    }

    var projectFile = app.project.file;
    if (!projectFile) {
      Utils.log("Проект не сохранен, невозможно найти видео", "ERROR");
      return 0;
    }

    // НАДЕЖНЫЙ СПОСОБ: используем parent (папка проекта) как Folder объект
    var projectFolder = projectFile.parent;

    Utils.log("Папка проекта: " + projectFolder.fsName);

    // Строим путь к папке с видео
    var videoFolderPath = projectFolder.fsName + CONFIG.VIDEO_FOLDER;
    var videoFolder = new Folder(videoFolderPath);

    Utils.log("Проверяем путь: " + videoFolderPath);

    if (!videoFolder.exists) {
      Utils.log("Папка с видео не найдена!", "ERROR");
      Utils.log("  Ожидаемый путь: " + videoFolderPath, "ERROR");

      // Выводим содержимое папки проекта для диагностики
      Utils.log("  Содержимое папки проекта:", "WARN");
      var files = projectFolder.getFiles();
      for (var f = 0; f < files.length && f < 10; f++) {
        Utils.log("    - " + files[f].name, "WARN");
      }

      return 0;
    }

    Utils.log("✓ Папка с видео найдена: " + videoFolder.fsName);

    // Перебираем прекомпозиции
    for (var i = 0; i < precomps.length; i++) {
      var precompInfo = precomps[i];
      var precompComp = precompInfo.comp;

      var videoNumber = extractVideoNumber(precompInfo.layerName);
      if (videoNumber === null) {
        Utils.log(
          "Не удалось извлечь номер из имени слоя: " +
            precompInfo.layerName +
            ". Пропускаем.",
          "WARN"
        );
        continue;
      }

      var videoFileName = "Video " + videoNumber + ".mp4";
      var videoFile = new File(videoFolder.fsName + "/" + videoFileName);

      Utils.log(
        '  Ищем видео для слоя "' +
          precompInfo.layerName +
          '": ' +
          videoFile.fsName
      );

      if (!videoFile.exists) {
        Utils.log("    ... Видео НЕ НАЙДЕНО. Пропускаем.", "WARN");
        continue;
      }

      Utils.log("    ... Видео НАЙДЕНО!");

      try {
        // Очищаем прекомпозицию
        while (precompComp.numLayers > 0) {
          precompComp.layer(1).remove();
        }

        var importOptions = new ImportOptions(videoFile);
        var videoItem = app.project.importFile(importOptions);
        var newLayer = precompComp.layers.add(videoItem);

        scaleToFit(newLayer, precompComp);

        Utils.log(
          "    ✓ Видео добавлено и масштабировано в композицию: " +
            precompComp.name
        );
        replacedCount++;
      } catch (e) {
        Utils.log(
          "    Ошибка при замене видео в композиции " +
            precompComp.name +
            ": " +
            e.toString(),
          "ERROR"
        );
      }
    }

    return replacedCount;
  }

  // Извлечение номера видео из имени слоя
  function extractVideoNumber(layerName) {
    var match = layerName.match(/(\d+)/); // Ищем любое число в названии
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  // Масштабирование слоя для заполнения композиции
  function scaleToFit(layer, comp) {
    var compWidth = comp.width;
    var compHeight = comp.height;
    var sourceWidth = layer.source.width;
    var sourceHeight = layer.source.height;

    var scaleX = (compWidth / sourceWidth) * 100;
    var scaleY = (compHeight / sourceHeight) * 100;
    var finalScale = Math.max(scaleX, scaleY);

    Utils.log("    Масштабирование до " + finalScale.toFixed(2) + "%");

    var scaleProperty = layer.property("Transform").property("Scale");
    scaleProperty.setValue([finalScale, finalScale]);

    var positionProperty = layer.property("Transform").property("Position");
    positionProperty.setValue([compWidth / 2, compHeight / 2]);
  }

  // ... (остальные функции остаются без изменений) ...
  function changeLayerColor(layer, colorRGB) {
    /*...*/
  }

  return {
    replaceAllText: replaceAllText,
    replaceVideosInPrecomps: replaceVideosInPrecomps,
    changeLayerColor: changeLayerColor,
  };
})();
