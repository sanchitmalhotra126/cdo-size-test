import React, {Component, PropTypes} from 'react';
import ToggleGroup from '../ToggleGroup';
import i18n from '@cdo/locale';

export const Galleries = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
};

const styles = {
  container: {
    textAlign: 'center',
    marginBottom: 20,
  }
};

class GallerySwitcher extends Component {
  static propTypes = {
    initialGallery: PropTypes.oneOf(Object.keys(Galleries)).isRequired,
    showGallery: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    this.toggleGallery = this.toggleGallery.bind(this);

    this.state = {
      // The source of truth for which gallery is displayed. This state should
      // live in the parent component, once there is one.
      gallery: props.initialGallery,
    };
  }

  toggleGallery() {
    const gallery = this.state.gallery === Galleries.PRIVATE ?
      Galleries.PUBLIC : Galleries.PRIVATE;

    this.props.showGallery(gallery);
    this.setState({gallery});
  }

  render() {
    return (
      <div style={styles.container}>
        <ToggleGroup
          selected={this.state.gallery}
          onChange={this.toggleGallery}
        >
          <button value={Galleries.PRIVATE}>
            {i18n.myProjects()}
          </button>
          <button value={Galleries.PUBLIC}>
            {i18n.publicGallery()}
          </button>
        </ToggleGroup>
      </div>
    );
  }
}
export default GallerySwitcher;
