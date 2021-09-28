import {PlaygroundSignalType, PlaygroundItemType} from './constants';
import {assets, starterAssets} from '@cdo/apps/clientApi';
import javalabMsg from '@cdo/javalab/locale';
import {getStore} from '../redux';
import {
  addItemData,
  removeItemData,
  changeItemData,
  setItemData,
  getItemIds
} from './playgroundRedux';

export default class Playground {
  constructor(
    onOutputMessage,
    onNewlineMessage,
    onJavabuilderMessage,
    levelName,
    // Only used for testing
    starterAssetsApi,
    assetsApi
  ) {
    this.onOutputMessage = onOutputMessage;
    this.onNewlineMessage = onNewlineMessage;
    this.onJavabuilderMessage = onJavabuilderMessage;
    this.isGameRunning = false;
    this.isGameOver = false;
    this.levelName = levelName;
    this.starterAssetFilenames = [];

    // Assigned only for testing; should use imports from clientApi normally
    this.starterAssetsApi = starterAssetsApi || starterAssets;
    this.assetsApi = assetsApi || assets;

    this.addPlaygroundItem = (itemId, itemData) =>
      getStore().dispatch(addItemData(itemId, itemData));
    this.removePlaygroundItem = itemId =>
      getStore().dispatch(removeItemData(itemId));
    this.changePlaygroundItem = (itemId, itemData) =>
      getStore().dispatch(changeItemData(itemId, itemData));
    this.setPlaygroundItems = itemData =>
      getStore().dispatch(setItemData(itemData));

    this.starterAssetsApi.getStarterAssets(
      levelName,
      this.onStarterAssetsReceived,
      () => {}
    );
  }

  onStop() {
    this.endGame();
    this.resetAudioElement();
  }

  onStarterAssetsReceived = result => {
    const response = JSON.parse(result.response);
    response.starter_assets.forEach(asset => {
      this.starterAssetFilenames.push(asset.filename);
    });
  };

  onFileLoadError = filename => {
    this.onOutputMessage(javalabMsg.fileLoadError({filename}));
    this.onNewlineMessage();
  };

  handleSignal(data) {
    switch (data.value) {
      case PlaygroundSignalType.RUN:
        this.isGameRunning = true;
        break;
      case PlaygroundSignalType.EXIT:
        this.endGame();
        break;
      case PlaygroundSignalType.ADD_CLICKABLE_ITEM:
        this.addClickableItem(data.detail);
        break;
      case PlaygroundSignalType.ADD_IMAGE_ITEM:
        this.addImageItem(data.detail);
        break;
      case PlaygroundSignalType.ADD_TEXT_ITEM:
        this.addTextItem(data.detail);
        break;
      case PlaygroundSignalType.CHANGE_ITEM:
        this.changeItem(data.detail);
        break;
      case PlaygroundSignalType.PLAY_SOUND:
        this.playSound(data.detail);
        break;
      case PlaygroundSignalType.REMOVE_ITEM:
        this.removeItem(data.detail);
        break;
      case PlaygroundSignalType.SET_BACKGROUND_IMAGE:
        this.setBackgroundImage(data.detail);
        break;
    }
  }

  addClickableItem(itemData) {
    this.addImageHelper(itemData, true);
  }

  addImageItem(itemData) {
    this.addImageHelper(itemData, false);
  }

  addImageHelper(itemData, isClickable) {
    // ignore request if the game is over or if the item already exists
    if (this.isGameOver || this.itemExists(itemData)) {
      return;
    }
    let onClick = isClickable
      ? () => this.handleImageClick(itemData.id)
      : () => {};

    const imageData = {
      fileUrl: this.getUrl(itemData.filename),
      x: itemData.x,
      y: itemData.y,
      height: itemData.height,
      width: itemData.width,
      index: itemData.index,
      onClick: onClick,
      type: PlaygroundItemType.IMAGE
    };
    this.addPlaygroundItem(itemData.id, imageData);
  }

  addTextItem(itemData) {
    if (this.isGameOver || this.itemExists(itemData)) {
      // can't add new items if the game is over or if the item already exists
      return;
    }
    console.log(itemData);

    const textData = {
      text: itemData.text,
      x: itemData.x,
      y: itemData.y,
      height: itemData.height,
      rotation: itemData.rotation,
      red: itemData.colorRed,
      blue: itemData.colorBlue,
      green: itemData.colorGreen,
      type: PlaygroundItemType.TEXT
    };
    this.addPlaygroundItem(itemData.id, textData);
  }

  removeItem(itemData) {
    if (this.isGameOver) {
      // can't remove items if game is over
      return;
    }
    if (this.itemExists(itemData)) {
      this.removePlaygroundItem(itemData.id);
    }
    // TODO: handle text deletion
  }

  changeItem(itemData) {
    if (this.isGameOver) {
      // can't change items if game is over
      return;
    }
    if (this.itemExists(itemData)) {
      const newImageData = {...itemData};
      if (itemData.filename) {
        newImageData.fileUrl = this.getUrl(itemData.filename);
        // we don't need to pass filename as imageData
        delete newImageData.filename;
      }
      this.changePlaygroundItem(itemData.id, newImageData);
    }
    // TODO: handle text changes
  }

  playSound(soundData) {
    if (this.isGameOver) {
      // can't play sound if game is over
      return;
    }

    this.setMediaElement(this.getAudioElement(), soundData.filename);
  }

  setBackgroundImage(backgroundData) {
    if (this.isGameOver) {
      // can't set background if game is over
      return;
    }

    const filename = backgroundData.filename;
    const backgroundElement = this.getBackgroundElement();
    this.setMediaElement(backgroundElement, filename);
    backgroundElement.style.opacity = 1.0;
  }

  setMediaElement(element, filename) {
    element.onerror = () => {
      this.onFileLoadError(filename);
    };
    element.src = this.getUrl(filename);
  }

  reset() {
    this.isGameOver = false;
    this.isGameRunning = false;
    // reset playground items to be empty
    this.setPlaygroundItems({});
    this.resetBackgroundElement();
    this.resetAudioElement();
  }

  // TODO: Call this from click handler on new clickable items
  handleImageClick(imageId) {
    if (this.isGameOver || !this.isGameRunning) {
      // can only handle click events if game is not over and game is running
      return;
    }
  }

  getUrl(filename) {
    if (this.starterAssetFilenames.includes(filename)) {
      return this.starterAssetsApi
        .withLevelName(this.levelName)
        .basePath(filename);
    } else {
      return this.assetsApi.basePath(filename);
    }
  }

  getBackgroundElement() {
    return document.getElementById('playground-background');
  }

  getAudioElement() {
    return document.getElementById('playground-audio');
  }

  resetAudioElement() {
    const audioElement = this.getAudioElement();
    audioElement.pause();
    this.resetMediaElement(audioElement);
  }

  resetBackgroundElement() {
    const backgroundElement = this.getBackgroundElement();
    backgroundElement.style.opacity = 0.0;
    this.resetMediaElement(backgroundElement);
  }

  resetMediaElement(element) {
    element.onerror = undefined;
    element.src = '';
  }

  endGame() {
    this.isGameRunning = false;
    this.isGameOver = true;
  }

  itemExists(itemData) {
    return getItemIds(getStore().getState().playground).includes(itemData.id);
  }
}
