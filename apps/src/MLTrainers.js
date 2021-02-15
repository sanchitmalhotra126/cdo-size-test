import KNN from 'ml-knn';

const KNNTrainers = ['knnClassify', 'knnRegress'];

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

/*

modelData = {
  selectedTrainer: "selectedTrainer",
  trainedModel: <JSON blob of trained model>,
  featureNumberKey: {
    feature1: {
      value1: convertedValue1,
      value2: convertedValue2
    },
    feature2: {
      value1: convertedValue1,
      value2: convertedValue2
    }
  },
  labelColumn: "labelColumn",
  selectedFeatures: ["feature1", "feature2"],
  testData: {
    feature1: value,
    feature2: value,
    feature3: value
  }
}
*/

function convertTestValue(featureNumberKey, feature, value) {
  return parseInt(featureNumberKey[feature][value]);
}

export function predict(modelData) {
  // Determine which algorithm to use.
  if (KNNTrainers.includes(modelData.selectedTrainer)) {
    // Re-instantiate the trained model.
    const model = KNN.load(modelData.trainedModel);
    // Prepare test data.
    const testValues = modelData.selectedFeatures.map(feature =>
      convertTestValue(
        modelData.featureNumberKey,
        feature,
        modelData.testData[feature]
      )
    );
    // Make a prediction.
    const rawPrediction = model.predict(testValues);
    // Convert prediction to human readable (if needed)
    const prediction = Object.keys(modelData.featureNumberKey).includes(
      modelData.labelColumn
    )
      ? getKeyByValue(
          modelData.featureNumberKey[modelData.labelColumn],
          rawPrediction
        )
      : parseFloat(rawPrediction);
    return prediction;
  } else {
    return 'Error: unknown trainer';
  }
}
