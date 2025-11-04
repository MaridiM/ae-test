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
    Utils.log("Replacing text in composition: " + comp.name);
    var changedCount = 0;

    try {
      for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);

        if (layer.property("Source Text")) {
          try {
            var textProp = layer.property("Source Text");
            var textDocument = textProp.value;

            Utils.log("  Changing text in layer: " + layer.name);
            Utils.log('    Was: "' + textDocument.text + '"');

            // Preserve formatting, only update the text
            textDocument.text = newText;
            textProp.setValue(textDocument);

            Utils.log('    Now: "' + newText + '"');
            changedCount++;
          } catch (e) {
            Utils.log(
              "    Error changing text in layer " +
                layer.name +
                ": " +
                e.toString(),
              "ERROR"
            );
          }
        }
      }
    } catch (e) {
      Utils.log("Critical error replacing text: " + e.toString(), "ERROR");
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
    Utils.log("Replacing videos in precompositions...");
    var replacedCount = 0;

    // Validate incoming data
    if (!precomps || precomps.length === 0) {
      Utils.log("  No precompositions found for video replacement.", "WARN");
      return 0;
    }

    try {
      var videoFolder = getVideoFolder();
      if (!videoFolder) {
        return 0;
      }

      Utils.log("✓ Video folder found: " + videoFolder.fsName);

      // Process each precomposition
      for (var i = 0; i < precomps.length; i++) {
        var precompInfo = precomps[i];

        try {
          if (replaceVideoInPrecomp(precompInfo, videoFolder)) {
            replacedCount++;
          }
        } catch (e) {
          Utils.log(
            "  Error processing precomposition " +
              precompInfo.layerName +
              ": " +
              e.toString(),
            "ERROR"
          );
        }
      }
    } catch (e) {
      Utils.log("Critical error replacing videos: " + e.toString(), "ERROR");
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
      Utils.log("Project not saved, cannot find videos", "ERROR");
      return null;
    }

    var projectFolder = projectFile.parent;
    var videoFolderPath = projectFolder.fsName + CONFIG.VIDEO_FOLDER;
    var videoFolder = new Folder(videoFolderPath);

    Utils.log("Checking path: " + videoFolderPath);

    if (!videoFolder.exists) {
      Utils.log("Video folder not found!", "ERROR");
      Utils.log("  Expected path: " + videoFolderPath, "ERROR");

      // Diagnostics: list the project folder contents
      Utils.log("  Project folder contents:", "WARN");
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
        "  Failed to extract number from layer name: " +
          precompInfo.layerName +
          ". Skipping.",
        "WARN"
      );
      return false;
    }

    // Verify that the video file exists
    var videoFileName = "Video " + videoNumber + ".mp4";
    var videoFile = new File(videoFolder.fsName + "/" + videoFileName);

    Utils.log(
      '  Looking for video for layer "' +
        precompInfo.layerName +
        '": ' +
        videoFile.fsName
    );

    if (!videoFile.exists) {
      Utils.log("    ... Video NOT FOUND. Skipping.", "WARN");
      return false;
    }

    Utils.log("    ... Video FOUND!");

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
        "    ✓ Video added and scaled in composition: " + precompComp.name
      );
      return true;
    } catch (e) {
      Utils.log(
        "    Error replacing video in composition " +
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

    Utils.log("    Scaling to " + finalScale.toFixed(2) + "%");

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
        "  ✓ Changed layer label color: " + layer.name + " → " + colorIndex
      );
      return true;
    } catch (e) {
      Utils.log("  Error changing label color: " + e.toString(), "ERROR");
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
          "  ✓ Position changed (keyframe): " + layer.name + " @ " + time + "s"
        );
      } else {
        position.setValue(newPosition);
        Utils.log(
          "  ✓ Position changed: " + layer.name + " → [" + newPosition + "]"
        );
      }
      return true;
    } catch (e) {
      Utils.log("  Error changing position: " + e.toString(), "ERROR");
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
          "  ✓ Scale changed (keyframe): " + layer.name + " @ " + time + "s"
        );
      } else {
        scale.setValue(newScale);
        Utils.log("  ✓ Scale changed: " + layer.name + " → " + newScale + "%");
      }
      return true;
    } catch (e) {
      Utils.log("  Error changing scale: " + e.toString(), "ERROR");
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
        "  ✓ Opacity changed: " + layer.name + " → " + newOpacity + "%"
      );
      return true;
    } catch (e) {
      Utils.log("  Error changing opacity: " + e.toString(), "ERROR");
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
        Utils.log("  Effect not found: " + effectName, "WARN");
        return false;
      }

      var param = effect.property(parameterName);
      if (!param) {
        Utils.log("  Parameter not found: " + parameterName, "WARN");
        return false;
      }

      param.setValue(newValue);
      Utils.log(
        "  ✓ Parameter changed: " +
          effectName +
          "." +
          parameterName +
          " → " +
          newValue
      );
      return true;
    } catch (e) {
      Utils.log("  Error changing effect parameter: " + e.toString(), "ERROR");
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
        Utils.log("  Effect not found: " + effectName, "WARN");
        return false;
      }

      var colorProp = effect.property("Color");
      if (colorProp) {
        colorProp.setValue(newColor);
        Utils.log("  ✓ Color changed in effect: " + effectName);
        return true;
      }

      return false;
    } catch (e) {
      Utils.log("  Error changing color: " + e.toString(), "ERROR");
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
      Utils.log("  Error changing timing: " + e.toString(), "ERROR");
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
      Utils.log("  Error changing start time: " + e.toString(), "ERROR");
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
        Utils.log("  Property not found: " + propertyPath, "WARN");
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
        "  ✓ Animation changed: " +
          propertyPath +
          " (" +
          keyframeChanges.length +
          " keyframes)"
      );
      return true;
    } catch (e) {
      Utils.log("  Error changing animation: " + e.toString(), "ERROR");
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
