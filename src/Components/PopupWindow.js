/**
 * Created by Zipeng Liu on 2016-11-10.
 */

import React, { Component } from 'react';
import {Button, Modal, FormGroup, FormControl, ControlLabel, HelpBlock} from 'react-bootstrap';
import {connect} from 'react-redux';
import {closeCreateNewSetWindow, typingTitle, createNewSet} from '../actions';

class PopupWindow extends Component {
    render() {
        return (
            <Modal show={this.props.showWindow} onHide={this.props.onHide}>
                <Modal.Header>
                    <Modal.Title>Creating New Sub-collection</Modal.Title>
                </Modal.Header>

                <form onSubmit={this.props.onSubmit}>
                    <Modal.Body>
                        <FormGroup controlId="create-new-set-form">
                            <ControlLabel>Sub-collection title:</ControlLabel>
                            <FormControl type="text" value={this.props.title} placeholder={this.props.placeholder}
                                         onChange={this.props.onChange}/>
                        </FormGroup>
                        <HelpBlock>Number of trees selected: {this.props.numTrees}</HelpBlock>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button onClick={this.props.onHide}>Cancel</Button>
                        <Button type="submit" >Confirm</Button>

                    </Modal.Footer>
                </form>
            </Modal>
        )
    }
}

function mapStateToProps(state) {
    return {
        showWindow: state.overview.createWindow,
        sets: state.sets,
        title: state.overview.currentTitle,
        placeholder: 'Enter sub-collection title',
        numTrees: Object.keys(state.selectedTrees).length
    }
}

function mapDispatchToProps(dispatch) {
    return {
        onHide: () => {dispatch(closeCreateNewSetWindow())},
        onChange: (e) => {dispatch(typingTitle(e.target.value))},
        onSubmit: (e) => {e.preventDefault(); dispatch(createNewSet())}
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(PopupWindow);
