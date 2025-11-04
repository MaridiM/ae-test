// ============================================
// MODIFIER MODULE - Modification module
// ============================================
// Adjusts project content:
// - Text replacement
// - Video replacement
// - Color, position, and effect changes
// - Animation modifications
// ============================================

var Modifier = (function () {
  // ========================================
  // TEXT OPERATIONS
  // ========================================

  /**
   * Replaces text in every text layer of a composition
   * @param {CompItem} comp - Composition to modify
   * @param {string} newText - New text value
   * @returns {number} Number of layers updated
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

            // Preserve formatting, only update the text
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
  // VIDEO OPERATIONS
  // ========================================

  /**
   * Replaces videos inside precompositions
   * @param {Array} precomps - List of precompositions
   * @returns {number} Count of videos replaced
   */
  function replaceVideosInPrecomps(precomps) {
    Utils.log("Заміна відео в прекомпозиціях...");
    var replacedCount = 0;

    // Validate incoming data
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

      // Process each precomposition
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
   * Retrieves the video folder
   * @returns {Folder|null} Folder or null
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

      // Diagnostics: list the project folder contents
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
   * Replaces the video within a single precomposition
   * @param {Object} precompInfo - Details about the precomposition
   * @param {Folder} videoFolder - Folder containing videos
   * @returns {boolean} Whether the operation succeeded
   */
  function replaceVideoInPrecomp(precompInfo, videoFolder) {
    var precompComp = precompInfo.comp;

    // Extract the video number from the layer name
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

    // Verify that the video file exists
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
      // Clear the precomposition
      clearComposition(precompComp);

      // Import and place the video
      var importOptions = new ImportOptions(videoFile);
      var videoItem = app.project.importFile(importOptions);
      var newLayer = precompComp.layers.add(videoItem);

      // Scale to fill the composition
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
   * Clears every layer in a composition
   * @param {CompItem} comp - Composition
   */
  function clearComposition(comp) {
    while (comp.numLayers > 0) {
      comp.layer(1).remove();
    }
  }

  /**
   * Extracts a video index from a layer name
   * @param {string} layerName - Layer name
   * @returns {number|null} Index or null
   */
  function extractVideoNumber(layerName) {
    var match = layerName.match(/(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  /**
   * Scales a layer to fill the composition
   * @param {Layer} layer - Layer
   * @param {CompItem} comp - Composition
   */
  function scaleToFit(layer, comp) {
    var compWidth = comp.width;
    var compHeight = comp.height;
    var sourceWidth = layer.source.width;
    var sourceHeight = layer.source.height;

    // Calculate the scale required to cover
    var scaleX = (compWidth / sourceWidth) * 100;
    var scaleY = (compHeight / sourceHeight) * 100;
    var finalScale = Math.max(scaleX, scaleY);

    Utils.log("    Масштабування до " + finalScale.toFixed(2) + "%");

    // Apply the scale
    var scaleProperty = layer.property("Transform").property("Scale");
    scaleProperty.setValue([finalScale, finalScale]);

    // Center the layer
    var positionProperty = layer.property("Transform").property("Position");
    positionProperty.setValue([compWidth / 2, compHeight / 2]);
  }

  // ========================================
  // LAYER PARAMETER MODIFICATION
  // ========================================

  /**
   * Changes a layer label color
   * @param {Layer} layer - Layer
   * @param {number} colorIndex - Color index (0-16)
   * @returns {boolean} Whether the change succeeded
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
   * Adjusts a layer position
   * @param {Layer} layer - Layer
   * @param {Array} newPosition - New position [x, y]
   * @param {number} time - Optional time for keyframing
   * @returns {boolean} Whether the change succeeded
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
   * Adjusts a layer scale
   * @param {Layer} layer - Layer
   * @param {Array} newScale - New scale [x, y]
   * @param {number} time - Optional time
   * @returns {boolean} Whether the change succeeded
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
   * Adjusts layer opacity
   * @param {Layer} layer - Layer
   * @param {number} newOpacity - New opacity (0-100)
   * @param {number} time - Optional time
   * @returns {boolean} Whether the change succeeded
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
  // EFFECT OPERATIONS
  // ========================================

  /**
   * Changes an effect parameter
   * @param {Layer} layer - Layer
   * @param {string} effectName - Effect name
   * @param {string} parameterName - Parameter name
   * @param {*} newValue - New value
   * @returns {boolean} Whether the change succeeded
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
   * Updates a Slider Control value
   * @param {Layer} layer - Layer
   * @param {string} effectName - Effect name
   * @param {number} newValue - New value
   * @returns {boolean} Whether the change succeeded
   */
  function changeSliderValue(layer, effectName, newValue) {
    return changeEffectParameter(layer, effectName, "Slider", newValue);
  }

  /**
   * Updates the color via a Color Control
   * @param {Layer} layer - Layer
   * @param {string} effectName - Effect name
   * @param {Array} newColor - New color [R, G, B, A] (0-1)
   * @returns {boolean} Whether the change succeeded
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
  // TIMING OPERATIONS
  // ========================================

  /**
   * Adjusts layer timing (in/out points)
   * @param {Layer} layer - Layer
   * @param {number} inPoint - Optional start time
   * @param {number} outPoint - Optional end time
   * @returns {boolean} Whether the change succeeded
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
   * Adjusts the layer start time
   * @param {Layer} layer - Layer
   * @param {number} newStartTime - New start time
   * @returns {boolean} Whether the change succeeded
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
  // ANIMATION MODIFICATION
  // ========================================

  /**
   * Bulk updates animation parameters
   * @param {Layer} layer - Layer
   * @param {string} propertyPath - Property path (e.g., "Transform")
   * @param {Array} keyframeChanges - Keyframe array [{time: 0, value: [0,0]}, ...]
   * @returns {boolean} Whether the change succeeded
   */
  function modifyAnimation(layer, propertyPath, keyframeChanges) {
    try {
      var prop = layer.property(propertyPath);
      if (!prop) {
        Utils.log("  Властивість не знайдено: " + propertyPath, "WARN");
        return false;
      }

      // Remove existing keyframes
      while (prop.numKeys > 0) {
        prop.removeKey(1);
      }

      // Add new keyframes
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
    // Text operations
    replaceAllText: replaceAllText,

    // Video operations
    replaceVideosInPrecomps: replaceVideosInPrecomps,

    // Parameter modifications
    changeLayerLabelColor: changeLayerLabelColor,
    changeLayerPosition: changeLayerPosition,
    changeLayerScale: changeLayerScale,
    changeLayerOpacity: changeLayerOpacity,

    // Effect operations
    changeEffectParameter: changeEffectParameter,
    changeSliderValue: changeSliderValue,
    changeColorControl: changeColorControl,

    // Timing operations
    changeLayerTiming: changeLayerTiming,
    changeLayerStartTime: changeLayerStartTime,

    // Animation
    modifyAnimation: modifyAnimation,
  };
})();
