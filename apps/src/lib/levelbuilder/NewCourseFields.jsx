import React, {useState} from 'react';
import HelpTip from '@cdo/apps/lib/ui/HelpTip';
import color from '@cdo/apps/util/color';
import PropTypes from 'prop-types';

export default function NewCourseFields(props) {
  const [selectedFamilyName, setSelectedFamilyName] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [versionedCourse, setVersionedCourse] = useState('');

  return (
    <div>
      <label>
        What family is this course a part of?
        <select
          value={selectedFamilyName}
          style={styles.dropdown}
          className="familyNameSelector"
          onChange={e => {
            setSelectedFamilyName(e.target.value);
            props.setFamilyName(e.target.value);
          }}
          disabled={newFamilyName !== ''}
        >
          <option value={''}>(None)</option>
          {props.families.map(familyOption => (
            <option key={familyOption} value={familyOption}>
              {familyOption}
            </option>
          ))}
        </select>
        <span>
          or{' '}
          <input
            type="text"
            value={newFamilyName}
            style={styles.smallInput}
            onChange={e => {
              setNewFamilyName(e.target.value);
              props.setFamilyName(e.target.value);
            }}
            disabled={selectedFamilyName !== ''}
          />
        </span>
        <HelpTip>
          <p>
            The family name is used to group together courses that are different
            version years of the same course so that users can be redirected
            between different version years. Family names should only contain
            letters, numbers, and dashes.
          </p>
        </HelpTip>
      </label>
      {props.familyName !== '' && (
        <div>
          <label>
            Is this course going to get updated yearly?
            <select
              style={styles.dropdown}
              value={versionedCourse}
              onChange={e => {
                setVersionedCourse(e.target.value);
                if (e.target.value === 'no') {
                  props.setVersionYear('unversioned');
                } else {
                  // Make sure to clear version year if change this question
                  props.setVersionYear('');
                }
              }}
            >
              <option key={'empty'} value={''}>
                {''}
              </option>
              <option key={'yes'} value={'yes'}>
                {'Yes'}
              </option>
              <option key={'no'} value={'no'}>
                {'No'}
              </option>
            </select>
            <HelpTip>
              <p>
                If you plan to make updates to this course and release a new
                version in the future you should choose yes. Most things about a
                course can not be edited once it is live.
              </p>
            </HelpTip>
          </label>
          {versionedCourse !== '' && (
            <label>
              What year is this course for?
              <select
                value={props.versionYear}
                name="version_year"
                style={styles.dropdown}
                className="versionYearSelector"
                disabled={versionedCourse === 'no'}
                onChange={event => props.setVersionYear(event.target.value)}
              >
                <option value="">(None)</option>
                {props.versionYearOptions.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

NewCourseFields.propTypes = {
  families: PropTypes.arrayOf(PropTypes.string).isRequired,
  versionYearOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  familyName: PropTypes.string.isRequired,
  setFamilyName: PropTypes.func.isRequired,
  versionYear: PropTypes.string.isRequired,
  setVersionYear: PropTypes.func.isRequired
};

const styles = {
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '4px 6px',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: 4,
    margin: 0
  },
  checkbox: {
    margin: '0 0 0 7px'
  },
  dropdown: {
    margin: '0 6px'
  },
  box: {
    marginTop: 10,
    marginBottom: 10,
    border: '1px solid ' + color.light_gray,
    padding: 10
  }
};
