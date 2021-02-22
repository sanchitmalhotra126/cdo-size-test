import React from 'react';
import {connect} from 'react-redux';
import {setEditorText} from './javalabRedux';
import PropTypes from 'prop-types';
import PaneHeader, {PaneSection} from '@cdo/apps/templates/PaneHeader';
import {EditorView} from '@codemirror/view';
import {editorSetup} from './editorSetup';
import {EditorState} from '@codemirror/state';

const style = {
  editor: {
    width: '100%',
    height: 600,
    backgroundColor: '#282c34'
  }
};

class JavalabEditor extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    // populated by redux
    editorText: PropTypes.string,
    setEditorText: PropTypes.func
  };

  componentDidMount() {
    this.editor = new EditorView({
      state: EditorState.create({
        extensions: editorSetup
      }),
      parent: this._codeMirror,
      dispatch: this.dispatchEditorChange()
    });
  }

  dispatchEditorChange = () => {
    // tr is a code mirror transaction
    // see https://codemirror.net/6/docs/ref/#state.Transaction
    return tr => {
      // we are overwriting the default dispatch method for codemirror,
      // so we need to manually call the update method.
      this.editor.update([tr]);
      // if there are changes to the editor, update redux.
      if (!tr.changes.empty && tr.newDoc) {
        this.props.setEditorText(tr.newDoc.toString());
      }
    };
  };

  render() {
    return (
      <div style={this.props.style}>
        <PaneHeader hasFocus={true}>
          <PaneSection>Editor</PaneSection>
        </PaneHeader>
        <div ref={el => (this._codeMirror = el)} style={style.editor} />
      </div>
    );
  }
}

export default connect(
  state => ({
    editorText: state.javalab.editorText
  }),
  dispatch => ({
    setEditorText: editorText => dispatch(setEditorText(editorText))
  })
)(JavalabEditor);
