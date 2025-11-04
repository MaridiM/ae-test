// ============================================
// MODIFIER MODULE - Модуль модифікації
// ============================================
// Змінює контент проекту:
// - Заміна тексту
// - Заміна відео
// - Зміна кольорів, позицій, ефектів
// - Модифікація анімації
// ============================================

var Modifier = (function () {
  // ========================================
  // РОБОТА З ТЕКСТОМ
  // ========================================

  /**
   * Замінює текст у всіх текстових шарах композиції
   * @param {CompItem} comp - Композиція
   * @param {string} newText - Новий текст
   * @returns {number} Кількість змінених шарів
   */
  function replaceAllText(comp, newText) {
    Utils.log("Заміна тексту в композиції: " + comp.name);
    var changedCount = 0;

    try {
      for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);

        if (layer.property("Source Text")) {
          try {
            var textProp = layer.property("Source Text");
            var textDocument = textProp.value;

            Utils.log("  Зміна тексту в шарі: " + layer.name);
            Utils.log('    Було: "' + textDocument.text + '"');

            // Зберігаємо форматування, змінюємо лише текст
            textDocument.text = newText;
            textProp.setValue(textDocument);

            Utils.log('    Стало: "' + newText + '"');
            changedCount++;
          } catch (e) {
            Utils.log(
              "    Помилка зміни тексту в шарі " +
                layer.name +
                ": " +
                e.toString(),
              "ERROR"
            );
          }
        }
      }
    } catch (e) {
      Utils.log("Критична помилка заміни тексту: " + e.toString(), "ERROR");
    }

    return changedCount;
  }

  // ========================================
  // РОБОТА З ВІДЕО
  // ========================================

  /**
   * Замінює відео у прекомпозиціях
   * @param {Array} precomps - Масив прекомпозицій
   * @returns {number} Кількість заміненого відео
   */
  function replaceVideosInPrecomps(precomps) {
    Utils.log("Заміна відео в прекомпозиціях...");
    var replacedCount = 0;

    // Валідація вхідних даних
    if (!precomps || precomps.length === 0) {
      Utils.log("  Не знайдено прекомпозицій для заміни відео.", "WARN");
      return 0;
    }

    try {
      var videoFolder = getVideoFolder();
      if (!videoFolder) {
        return 0;
      }

      Utils.log("✓ Папка з відео знайдена: " + videoFolder.fsName);

      // Обробляємо кожну прекомпозицію
      for (var i = 0; i < precomps.length; i++) {
        var precompInfo = precomps[i];

        try {
          if (replaceVideoInPrecomp(precompInfo, videoFolder)) {
            replacedCount++;
          }
        } catch (e) {
          Utils.log(
            "  Помилка обробки прекомпозиції " +
              precompInfo.layerName +
              ": " +
              e.toString(),
            "ERROR"
          );
        }
      }
    } catch (e) {
      Utils.log("Критична помилка заміни відео: " + e.toString(), "ERROR");
    }

    return replacedCount;
  }

  /**
   * Отримує папку з відео
   * @returns {Folder|null} Папка або null
   */
  function getVideoFolder() {
    var projectFile = app.project.file;

    if (!projectFile) {
      Utils.log("Проект не збережено, неможливо знайти відео", "ERROR");
      return null;
    }

    var projectFolder = projectFile.parent;
    var videoFolderPath = projectFolder.fsName + CONFIG.VIDEO_FOLDER;
    var videoFolder = new Folder(videoFolderPath);

    Utils.log("Перевіряємо шлях: " + videoFolderPath);

    if (!videoFolder.exists) {
      Utils.log("Папка з відео не знайдена!", "ERROR");
      Utils.log("  Очікуваний шлях: " + videoFolderPath, "ERROR");

      // Діагностика: виводимо вміст папки проекту
      Utils.log("  Вміст папки проекту:", "WARN");
      var files = projectFolder.getFiles();
      for (var i = 0; i < Math.min(files.length, 10); i++) {
        Utils.log("    - " + files[i].name, "WARN");
      }

      return null;
    }

    return videoFolder;
  }

  /**
   * Замінює відео в одній прекомпозиції
   * @param {Object} precompInfo - Інформація про прекомпозицію
   * @param {Folder} videoFolder - Папка з відео
   * @returns {boolean} Успішність операції
   */
  function replaceVideoInPrecomp(precompInfo, videoFolder) {
    var precompComp = precompInfo.comp;

    // Витягуємо номер відео з назви шару
    var videoNumber = extractVideoNumber(precompInfo.layerName);
    if (videoNumber === null) {
      Utils.log(
        "  Не вдалося витягти номер з назви шару: " +
          precompInfo.layerName +
          ". Пропускаємо.",
        "WARN"
      );
      return false;
    }

    // Перевіряємо наявність відеофайлу
    var videoFileName = "Video " + videoNumber + ".mp4";
    var videoFile = new File(videoFolder.fsName + "/" + videoFileName);

    Utils.log(
      '  Шукаємо відео для шару "' +
        precompInfo.layerName +
        '": ' +
        videoFile.fsName
    );

    if (!videoFile.exists) {
      Utils.log("    ... Відео НЕ ЗНАЙДЕНО. Пропускаємо.", "WARN");
      return false;
    }

    Utils.log("    ... Відео ЗНАЙДЕНО!");

    try {
      // Очищаємо прекомпозицію
      clearComposition(precompComp);

      // Імпортуємо та додаємо відео
      var importOptions = new ImportOptions(videoFile);
      var videoItem = app.project.importFile(importOptions);
      var newLayer = precompComp.layers.add(videoItem);

      // Масштабуємо для заповнення композиції
      scaleToFit(newLayer, precompComp);

      Utils.log(
        "    ✓ Відео додано та масштабовано в композицію: " + precompComp.name
      );
      return true;
    } catch (e) {
      Utils.log(
        "    Помилка при заміні відео в композиції " +
          precompComp.name +
          ": " +
          e.toString(),
        "ERROR"
      );
      return false;
    }
  }

  /**
   * Очищає всі шари в композиції
   * @param {CompItem} comp - Композиція
   */
  function clearComposition(comp) {
    while (comp.numLayers > 0) {
      comp.layer(1).remove();
    }
  }

  /**
   * Витягує номер відео з назви шару
   * @param {string} layerName - Назва шару
   * @returns {number|null} Номер або null
   */
  function extractVideoNumber(layerName) {
    var match = layerName.match(/(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  /**
   * Масштабує шар для заповнення композиції
   * @param {Layer} layer - Шар
   * @param {CompItem} comp - Композиція
   */
  function scaleToFit(layer, comp) {
    var compWidth = comp.width;
    var compHeight = comp.height;
    var sourceWidth = layer.source.width;
    var sourceHeight = layer.source.height;

    // Обчислюємо масштаб для заповнення (cover)
    var scaleX = (compWidth / sourceWidth) * 100;
    var scaleY = (compHeight / sourceHeight) * 100;
    var finalScale = Math.max(scaleX, scaleY);

    Utils.log("    Масштабування до " + finalScale.toFixed(2) + "%");

    // Застосовуємо масштаб
    var scaleProperty = layer.property("Transform").property("Scale");
    scaleProperty.setValue([finalScale, finalScale]);

    // Центруємо
    var positionProperty = layer.property("Transform").property("Position");
    positionProperty.setValue([compWidth / 2, compHeight / 2]);
  }

  // ========================================
  // МОДИФІКАЦІЯ ПАРАМЕТРІВ ШАРІВ
  // ========================================

  /**
   * Змінює колір мітки шару
   * @param {Layer} layer - Шар
   * @param {number} colorIndex - Індекс кольору (0-16)
   * @returns {boolean} Успішність
   */
  function changeLayerLabelColor(layer, colorIndex) {
    try {
      layer.label = colorIndex;
      Utils.log(
        "  ✓ Змінено колір мітки шару: " + layer.name + " → " + colorIndex
      );
      return true;
    } catch (e) {
      Utils.log("  Помилка зміни кольору мітки: " + e.toString(), "ERROR");
      return false;
    }
  }

  /**
   * Змінює позицію шару
   * @param {Layer} layer - Шар
   * @param {Array} newPosition - Нова позиція [x, y]
   * @param {number} time - Час (опціонально, для keyframe)
   * @returns {boolean} Успішність
   */
  function changeLayerPosition(layer, newPosition, time) {
    try {
      var position = layer.property("Transform").property("Position");

      if (time !== undefined) {
        position.setValueAtTime(time, newPosition);
        Utils.log(
          "  ✓ Позиція змінена (keyframe): " + layer.name + " @ " + time + "s"
        );
      } else {
        position.setValue(newPosition);
        Utils.log(
          "  ✓ Позиція змінена: " + layer.name + " → [" + newPosition + "]"
        );
      }
      return true;
    } catch (e) {
      Utils.log("  Помилка зміни позиції: " + e.toString(), "ERROR");
      return false;
    }
  }

  /**
   * Змінює масштаб шару
   * @param {Layer} layer - Шар
   * @param {Array} newScale - Новий масштаб [x, y]
   * @param {number} time - Час (опціонально)
   * @returns {boolean} Успішність
   */
  function changeLayerScale(layer, newScale, time) {
    try {
      var scale = layer.property("Transform").property("Scale");

      if (time !== undefined) {
        scale.setValueAtTime(time, newScale);
        Utils.log(
          "  ✓ Масштаб змінено (keyframe): " + layer.name + " @ " + time + "s"
        );
      } else {
        scale.setValue(newScale);
        Utils.log(
          "  ✓ Масштаб змінено: " + layer.name + " → " + newScale + "%"
        );
      }
      return true;
    } catch (e) {
      Utils.log("  Помилка зміни масштабу: " + e.toString(), "ERROR");
      return false;
    }
  }

  /**
   * Змінює непрозорість шару
   * @param {Layer} layer - Шар
   * @param {number} newOpacity - Нова непрозорість (0-100)
   * @param {number} time - Час (опціонально)
   * @returns {boolean} Успішність
   */
  function changeLayerOpacity(layer, newOpacity, time) {
    try {
      var opacity = layer.property("Transform").property("Opacity");

      if (time !== undefined) {
        opacity.setValueAtTime(time, newOpacity);
      } else {
        opacity.setValue(newOpacity);
      }
      Utils.log(
        "  ✓ Прозорість змінена: " + layer.name + " → " + newOpacity + "%"
      );
      return true;
    } catch (e) {
      Utils.log("  Помилка зміни прозорості: " + e.toString(), "ERROR");
      return false;
    }
  }

  // ========================================
  // РОБОТА З ЕФЕКТАМИ
  // ========================================

  /**
   * Змінює параметр ефекту
   * @param {Layer} layer - Шар
   * @param {string} effectName - Назва ефекту
   * @param {string} parameterName - Назва параметра
   * @param {*} newValue - Нове значення
   * @returns {boolean} Успішність
   */
  function changeEffectParameter(layer, effectName, parameterName, newValue) {
    try {
      var effect = Utils.getEffect(layer, effectName);
      if (!effect) {
        Utils.log("  Ефект не знайдено: " + effectName, "WARN");
        return false;
      }

      var param = effect.property(parameterName);
      if (!param) {
        Utils.log("  Параметр не знайдено: " + parameterName, "WARN");
        return false;
      }

      param.setValue(newValue);
      Utils.log(
        "  ✓ Параметр змінено: " +
          effectName +
          "." +
          parameterName +
          " → " +
          newValue
      );
      return true;
    } catch (e) {
      Utils.log("  Помилка зміни параметра ефекту: " + e.toString(), "ERROR");
      return false;
    }
  }

  /**
   * Змінює значення Slider Control
   * @param {Layer} layer - Шар
   * @param {string} effectName - Назва ефекту
   * @param {number} newValue - Нове значення
   * @returns {boolean} Успішність
   */
  function changeSliderValue(layer, effectName, newValue) {
    return changeEffectParameter(layer, effectName, "Slider", newValue);
  }

  /**
   * Змінює колір через Color Control
   * @param {Layer} layer - Шар
   * @param {string} effectName - Назва ефекту
   * @param {Array} newColor - Новий колір [R, G, B, A] (0-1)
   * @returns {boolean} Успішність
   */
  function changeColorControl(layer, effectName, newColor) {
    try {
      var effect = Utils.getEffect(layer, effectName);
      if (!effect) {
        Utils.log("  Ефект не знайдено: " + effectName, "WARN");
        return false;
      }

      var colorProp = effect.property("Color");
      if (colorProp) {
        colorProp.setValue(newColor);
        Utils.log("  ✓ Колір змінено в ефекті: " + effectName);
        return true;
      }

      return false;
    } catch (e) {
      Utils.log("  Помилка зміни кольору: " + e.toString(), "ERROR");
      return false;
    }
  }

  // ========================================
  // РОБОТА З ТАЙМІНГОМ
  // ========================================

  /**
   * Змінює тайминг шару (in/out points)
   * @param {Layer} layer - Шар
   * @param {number} inPoint - Час початку (опціонально)
   * @param {number} outPoint - Час кінця (опціонально)
   * @returns {boolean} Успішність
   */
  function changeLayerTiming(layer, inPoint, outPoint) {
    try {
      if (inPoint !== undefined && inPoint !== null) {
        layer.inPoint = inPoint;
        Utils.log("  ✓ In Point: " + layer.name + " → " + inPoint + "s");
      }

      if (outPoint !== undefined && outPoint !== null) {
        layer.outPoint = outPoint;
        Utils.log("  ✓ Out Point: " + layer.name + " → " + outPoint + "s");
      }

      return true;
    } catch (e) {
      Utils.log("  Помилка зміни таймінгу: " + e.toString(), "ERROR");
      return false;
    }
  }

  /**
   * Змінює час початку шару
   * @param {Layer} layer - Шар
   * @param {number} newStartTime - Новий час початку
   * @returns {boolean} Успішність
   */
  function changeLayerStartTime(layer, newStartTime) {
    try {
      layer.startTime = newStartTime;
      Utils.log("  ✓ Start Time: " + layer.name + " → " + newStartTime + "s");
      return true;
    } catch (e) {
      Utils.log("  Помилка зміни start time: " + e.toString(), "ERROR");
      return false;
    }
  }

  // ========================================
  // МОДИФІКАЦІЯ АНІМАЦІЇ
  // ========================================

  /**
   * Масово змінює параметри анімації
   * @param {Layer} layer - Шар
   * @param {string} propertyPath - Шлях до властивості (напр. "Transform")
   * @param {Array} keyframeChanges - Масив keyframes [{time: 0, value: [0,0]}, ...]
   * @returns {boolean} Успішність
   */
  function modifyAnimation(layer, propertyPath, keyframeChanges) {
    try {
      var prop = layer.property(propertyPath);
      if (!prop) {
        Utils.log("  Властивість не знайдено: " + propertyPath, "WARN");
        return false;
      }

      // Видаляємо старі keyframes
      while (prop.numKeys > 0) {
        prop.removeKey(1);
      }

      // Додаємо нові
      for (var i = 0; i < keyframeChanges.length; i++) {
        var kf = keyframeChanges[i];
        prop.setValueAtTime(kf.time, kf.value);
      }

      Utils.log(
        "  ✓ Анімацію змінено: " +
          propertyPath +
          " (" +
          keyframeChanges.length +
          " keyframes)"
      );
      return true;
    } catch (e) {
      Utils.log("  Помилка зміни анімації: " + e.toString(), "ERROR");
      return false;
    }
  }


  return {
    // Робота з текстом
    replaceAllText: replaceAllText,

    // Робота з відео
    replaceVideosInPrecomps: replaceVideosInPrecomps,

    // Модифікація параметрів
    changeLayerLabelColor: changeLayerLabelColor,
    changeLayerPosition: changeLayerPosition,
    changeLayerScale: changeLayerScale,
    changeLayerOpacity: changeLayerOpacity,

    // Робота з ефектами
    changeEffectParameter: changeEffectParameter,
    changeSliderValue: changeSliderValue,
    changeColorControl: changeColorControl,

    // Робота з таймінгом
    changeLayerTiming: changeLayerTiming,
    changeLayerStartTime: changeLayerStartTime,

    // Анімація
    modifyAnimation: modifyAnimation,
  };
})();
