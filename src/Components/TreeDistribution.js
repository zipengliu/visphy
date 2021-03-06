/**
 * Created by zipeng on 2017-05-03.
 */

import React, {Component} from 'react';
import {connect} from 'react-redux';
import cn from 'classnames';
import {scaleLinear} from 'd3';
import {Button, ButtonGroup, Table, Badge, Glyphicon, MenuItem} from 'react-bootstrap';
import {toggleSubsetDistribution, toggleSelectTrees, toggleTreeDistributionCollapse, toggleHighlightSegment,
    toggleTDExtendedMenu, toggleTaxaMembershipView} from '../actions';


class TreeDistribution extends Component {
    render() {
        let {expandedBranches, sets, treeDistribution, membershipViewer, banMembershipViewer, selectedTreeColor} = this.props;
        let {showSubsets, tooltipMsg, collapsed, data, extendedMenu} = treeDistribution;
        let numTrees = sets[0].tids.length;
        let expandedArr = Object.keys(expandedBranches);

        let membershipMapping = {};
        let fullNumbering = {};
        if (!banMembershipViewer) {
            for (let i = 0; i < membershipViewer.length; i++) {
                let m = membershipViewer[i];
                if (!membershipMapping.hasOwnProperty(m.bid)) {
                    membershipMapping[m.bid] = {}
                }
                membershipMapping[m.bid][m.tid] = i + 1;
            }
            for (let bid in data[0]) if (data[0].hasOwnProperty(bid) && membershipMapping.hasOwnProperty(bid)) {
                fullNumbering[bid] = {};
                for (let tid in membershipMapping[bid]) if (membershipMapping[bid].hasOwnProperty(tid)) {
                    fullNumbering[bid][data[0][bid].treeToBin[tid]] = membershipMapping[bid][tid];
                }
            }
        }

        let renderBars = (d, bid, setIndex) => {
            let fullLength = Math.floor(d.n / numTrees * 100);
            let x = scaleLinear().domain([0, d.n]).range([0, 100]);
            let branchNo = expandedBranches[bid];
            let curN = 0;
            let numbering = {};
            if (fullNumbering.hasOwnProperty(bid)) {
                if (setIndex > 0) {
                    for (let i = 0; i < d.bins.length; i++) {
                        let tid = d.bins[i][0];
                        if (fullNumbering[bid].hasOwnProperty(data[0][bid].treeToBin[tid])) {
                            numbering[i] = fullNumbering[bid][data[0][bid].treeToBin[tid]];
                        }
                    }
                } else {
                    numbering = fullNumbering[bid];
                }
            }
            return (
                <div style={{position: 'relative', height: '100%', minHeight: '10px', width: fullLength + '%', border: '1px solid #ccc'}}>
                    {d.bins.map((b, i) => {
                        let leftPos = x(curN);
                        curN += b.length;
                        return (
                            <div key={i} style={{ borderRight: i !== d.bins.length - 1?
                                (d.selectCnt[i] === b.length? '1px solid ' + selectedTreeColor: '1px solid #888'): 'none',
                                position: 'absolute', top: 0, height: '100%', left: leftPos + '%', width: x(b.length) + '%'}}
                                 onMouseEnter={this.props.onHighlightSegment.bind(null, b, banMembershipViewer? []: d.entities[i],
                                     `This cluster (#trees=${b.length}) ${d.hasCompatibleTree && i === 0? 'agrees': 'disagrees'} with branch ${branchNo} in the reference tree.`)}
                                 onMouseLeave={this.props.onHighlightSegment.bind(null, [], [], null)}
                                 onClick={(e) => {
                                     e.stopPropagation();
                                     e.preventDefault();
                                     if (e.altKey) {
                                         this.props.onToggleTDExtendedMenu(bid, b[0], e.clientX, e.clientY, i in numbering? numbering[i] - 1: null);
                                     } else {
                                         this.props.onSelectTrees(b, e.shiftKey);
                                     }}}
                            >
                                {d.hasCompatibleTree && i === 0 &&
                                <div style={{fontSize: '16px', position: 'relative', top: '50%', left: '2px', transform: 'translateY(-50%)'}}>
                                    <Glyphicon glyph="registration-mark" />
                                </div>}
                                {d.selectCnt && d.selectCnt[i] > 0 &&
                                <div style={{position: 'absolute', top: '15%', left: 0, height: '70%',
                                    backgroundColor: selectedTreeColor, opacity: .6,
                                    width: d.selectCnt[i] / b.length * 100 + '%'}} />}
                                {d.highlightCnt && d.highlightCnt[i] > 0 &&
                                <div style={{position: 'absolute', top: '15%', left: 0, height: '70%',
                                    border: '1px solid #000', zIndex: 50,
                                    width: d.highlightCnt[i] / b.length * 100 + '%'}} />}
                                {numbering.hasOwnProperty(i) &&
                                <div style={{position: 'absolute', top: '2px', right: '2px', width: '14px', height: '14px',
                                    background: 'black', color: 'white', borderRadius: '50%', textAlign: 'center', verticalAlign: 'middle'}}>
                                    {numbering[i]}</div>}
                            </div>
                        )
                    })}
                    {'\u200B'}
                </div>
            )
        };

        return (
            <div id="tree-distribution" className={cn("view panel panel-default", {'panel-collapsed': collapsed})}
                 onClick={() => {this.props.onToggleTDExtendedMenu()}}>
                <div className="view-header panel-heading">
                    <div className="view-title">
                        Tree Distribution by Reference Partition
                        <span style={{marginLeft: '10px', cursor: 'pointer', float: 'right'}} onClick={this.props.onToggleCollapsed}>
                            <Glyphicon glyph={collapsed? 'th-list': 'minus'}/>
                        </span>
                    </div>
                </div>

                {expandedArr.length === 0 &&
                <div className="panel-body">
                    There is no branch of interest yet. Please select from the reference tree (click a branch).
                </div>
                }

                {expandedArr.length > 0 &&
                <Table condensed bordered>
                    <thead>
                    <tr>
                        <th style={{width: '100px'}}>Tree collection</th>
                        <th style={{width: '50px'}}>Partition</th>
                        <th>Distribution</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.map((s, i) =>
                        (expandedArr.map((bid, j) =>
                            <tr key={`${i}-${j}`}>
                                {j === 0 &&
                                <td rowSpan={expandedArr.length}>
                                    {sets[i].title} {expandedArr.length > 1 && <br/>}
                                    <Badge style={{backgroundColor: sets[i].color}}>{sets[i].tids.length}</Badge>
                                </td>}
                                <td style={{fontWeight: 'bold', textAlign: 'center'}}>{expandedBranches[bid]}</td>
                                <td style={{height: '100%', padding: 0}}>
                                    {renderBars(s[bid], bid, i)}
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </Table>
                }

                <div className="panel-footer">
                    {sets.length > 1 &&
                    <div style={{display: 'inline-block'}}>
                        <ButtonGroup bsSize="xsmall">
                            <Button active={showSubsets} onClick={this.props.onToggleSubsetDistribution}>Show</Button>
                            <Button active={!showSubsets} onClick={this.props.onToggleSubsetDistribution}>Hide</Button>
                        </ButtonGroup>
                        <span> distribution for sub-collections. </span>
                    </div>
                    }
                    {!!tooltipMsg && <span>{tooltipMsg}</span>}

                    <div className="legend">
                        <span>Segment (group of trees): </span>
                        <div className="legend-item">
                            <span>shared same taxa membership with ref. (</span>
                            <Glyphicon glyph="registration-mark" style={{fontSize: '12px'}} />
                            <span>)</span>
                        </div>
                        <div className="legend-item">
                            <span>selected (</span>
                            <div style={{display: 'inline-block', margin: '0 2px', height: '10px', width: '12px',
                                background: selectedTreeColor, opacity: '.6'}} />
                            <span>)</span>
                        </div>
                        <div className="legend-item">
                            <span>hovered (</span>
                            <div style={{display: 'inline-block', margin: '0 2px', height: '10px', width: '10px',
                                border: '1px solid black'}} />
                            <span>)</span>
                        </div>
                    </div>

                </div>

                {!banMembershipViewer && extendedMenu.bid &&
                <ul className="dropdown-menu open tree-distribution-extended-menu"
                    style={{position: 'fixed', display: 'block', zIndex: '200', left: extendedMenu.x + 'px', top: extendedMenu.y + 'px'}}>
                    <MenuItem onClick={extendedMenu.viewerIndex === null?
                        this.props.onToggleTaxaMembershipView.bind(null, extendedMenu.bid, extendedMenu.tid, null):
                        this.props.onToggleTaxaMembershipView.bind(null, null, null, extendedMenu.viewerIndex)}>
                        {extendedMenu.viewerIndex === null? 'I': 'Cancel i'}nspect taxa membership
                    </MenuItem>
                </ul>}
            </div>
        )
    }
}


let mapStateToProps = state => ({
    expandedBranches: state.referenceTree.expanded,
    sets: state.sets,
    treeDistribution: state.treeDistribution,
    membershipViewer: state.referenceTree.membershipViewer,
    banMembershipViewer: state.inputGroupData.hasMissingTaxa && state.cb === 'cb2',
    selectedTreeColor: state.selectedTreeColor,
});

let mapDispatchToProps = dispatch => ({
    onToggleSubsetDistribution: () => {dispatch(toggleSubsetDistribution())},
    onHighlightSegment: (tids, entities, msg) => {dispatch(toggleHighlightSegment(tids, entities, msg))},
    onSelectTrees: (tids, isAdd) => {dispatch(toggleSelectTrees(tids, isAdd))},
    onToggleCollapsed: () => {dispatch(toggleTreeDistributionCollapse())},
    onToggleTDExtendedMenu: (bid=null, tid=null, x=null, y=null, v=null) => {dispatch(toggleTDExtendedMenu(bid, tid, x, y, v))},
    onToggleTaxaMembershipView: (bid, tid, v=null) => {dispatch(toggleTaxaMembershipView(bid, tid, v))},
});

export default connect(mapStateToProps, mapDispatchToProps)(TreeDistribution);
