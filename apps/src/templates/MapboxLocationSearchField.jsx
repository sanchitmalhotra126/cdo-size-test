/* globals MapboxGeocoder */
import PropTypes from 'prop-types';
import React from 'react';
import i18n from '@cdo/locale';
import {connect} from 'react-redux';
/**
 * A search box that loads a Mapbox location search control.
 *
 * Note: Mapbox location search requires the following line to be present in the haml where this component is used:
 *   %script{type: "text/javascript", src: "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.5.1/mapbox-gl-geocoder.min.js"}
 *   %link{rel: "stylesheet", type: "text/css", href: "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.5.1/mapbox-gl-geocoder.css"}
 */
export class MapboxLocationSearchField extends React.Component {
  static propTypes = {
    // Note: if mapboxAccessToken is not defined, then nothing will be rendered.
    mapboxAccessToken: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
    readOnly: PropTypes.bool,
    style: PropTypes.object,
    className: PropTypes.string,
    // location type reference - https://docs.mapbox.com/api/search/#data-types
    locationTypes: PropTypes.array
  };

  static defaultProps = {
    locationTypes: [
      'address',
      'country',
      'region',
      'place',
      'postcode',
      'locality',
      'neighborhood'
    ]
  };

  componentDidMount() {
    // Don't render this mapbox component if this host doesn't have access to mapbox.
    if (!this.props.mapboxAccessToken || this.props.readOnly) {
      return;
    }
    // eslint-disable-next-line no-undef
    const mapboxGeocoder = new MapboxGeocoder({
      accessToken: this.props.mapboxAccessToken,
      types: this.props.locationTypes.join(','),
      placeholder:
        this.props.placeholder || i18n.schoolLocationSearchPlaceholder()
    });
    mapboxGeocoder.addTo(`#${this.searchContainerRef.id}`);
    mapboxGeocoder.setInput(this.props.value);
    mapboxGeocoder.on('result', event => {
      const location = event && event.result && event.result.place_name;
      this.props.onChange({target: {value: location}});
    });
  }

  render() {
    return (
      <div
        ref={el => (this.searchContainerRef = el)}
        id="mapbox-location-search-container"
      >
        {(this.props.readOnly || !this.props.mapboxAccessToken) && (
          <input
            type={'text'}
            style={this.props.style}
            className={`${this.props.className} readOnly`}
            value={this.props.value}
            disabled={this.props.readOnly}
            onChange={this.props.onChange}
          />
        )}
      </div>
    );
  }
}

export default connect(state => ({
  mapboxAccessToken: state.mapbox.mapboxAccessToken
}))(MapboxLocationSearchField);
