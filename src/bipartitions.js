/**
 * Created by zipeng on 2017-05-09.
 */

import BitSet from 'bitset.js';
import {createMappingFromArray, subtractMapping} from './utils';

const hashTableSizes = [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384,
    32768, 65536, 131072, 262144, 524288, 1048576, 2097152,
    4194304, 8388608, 16777216, 33554432, 67108864, 134217728,
    268435456, 536870912, 1073741824, 2147483648
];
const numConflictsThreshold = 10;


// Hash the bit vector.  v is a BitSet object, size is the size of the hash table.
function getBitVectorHash(v, size) {
    let s = v.toString(16);
    // FIXME
    return s;

    let i = 0;
    let h = 0;
    while (i + 8 < s.length) {
        let val = parseInt(s.slice(i, i + 7), 16);
        h = (h + val) % size;
        i += 8;
    }
    if (i < s.length) {
        let val = parseInt(s.slice(i), 16);
        h = (h + val) % size;
    }
    return h;
}

function getBitVector(entityArr) {
    let idx = entityArr.map(eid => parseInt(eid.slice(1))).sort();
    return BitSet(idx);
}

// Get the bit vector for an entity array in canonical form.
//  Canonical form: the bit corresponding to the present taxa with the lowest index must be zero.
//  This is for avoiding different bit vectors for the same bipartition because of bit is set for ingroup vs. outgroup.
function getCanonicalBitVector(inGroupEntities, present) {
    let inGroupIdx = inGroupEntities.map(eid => parseInt(eid.slice(1))).sort();
    let ingroupMapping = createMappingFromArray(inGroupIdx);

    // FIXME: this is wrong when there are duplicates!
    let getOutgroupIdx = () => {
        let o = [];
        for (let i = 0; i < present.length; i++) {
            if (!ingroupMapping.hasOwnProperty(present[i])) o.push(present[i]);
        }
        return o;
    };

    let bitSetArr = ingroupMapping.hasOwnProperty(present[0])? getOutgroupIdx(): inGroupIdx;
    return BitSet(bitSetArr);
}

function getHashTableSize(n, t, loadRatio=2) {
    let numBranches = n * (t - 3);
    for (let i = 0; i < hashTableSizes.length; i++) {
        if (numBranches * loadRatio <= hashTableSizes[i]) {
            return hashTableSizes[i];
        }
    }
    // Too many branches
    return -1;
}

function getPresentEntities(all, missing) {
    let r = [];
    let m = createMappingFromArray(missing);
    for (let eid in all) if (all.hasOwnProperty(eid) && !m.hasOwnProperty(eid)) {
        r.push(parseInt(eid.slice(1)))
    }
    return r.sort();
}

class BipartitionList {
    constructor(referenceTree, trees, allEntities) {
        let numTrees = Object.keys(trees).length;
        let numTaxa = Object.keys(allEntities).length;

        this.numEntries = 0;
        this.numBips = 0;
        this.hash = {};
        this.size = getHashTableSize(numTrees, numTaxa, 2);
        // entries sorted by frequency
        this.entriesArray = [];

        // Hash all bipartitions in the tree vector
        for (let tid in trees) if (trees.hasOwnProperty(tid)) {
            let tIdx = parseInt(tid.slice(1));
            let branches = trees[tid].branches;
            let vMissing = getBitVector(trees[tid].missing);
            let entitiesInTree = getPresentEntities(allEntities, trees[tid].missing);

            for (let bid in branches) if (branches.hasOwnProperty(bid)) {
                let b = branches[bid];
                // Filter the trivial branches
                if (!b.isLeaf && bid !== trees[tid].rootBranch && bid !== branches[trees[tid].rootBranch].right) {
                    this.numBips += 1;
                    let v = getCanonicalBitVector(b.entities, entitiesInTree);
                    let h = getBitVectorHash(v, this.size);
                    let found = false;

                    if (this.hash.hasOwnProperty(h)) {
                        let bucket = this.hash[h];
                        for (let i = 0; i < bucket.length; i++) {
                            if (v.equals(bucket[i].bitVector) && vMissing.equals(bucket[i].missingMask)) {
                                found = true;
                                bucket[i].numBips += 1;
                                bucket[i].treeVector.set(tIdx);
                                break;
                            }
                        }
                    } else {
                        this.hash[h] = [];
                    }
                    if (!found) {
                        this.numEntries += 1;
                        let newEntry = {
                            entities: b.entities,
                            bitVector: v,
                            missingMask: vMissing,
                            treeVector: BitSet([tIdx]),
                            numBips: 1,
                        };
                        this.hash[h].push(newEntry);
                        this.entriesArray.push(newEntry);
                    }
                }
            }
        }

        this.entriesArray.sort((a, b) => (b.numBips - a.numBips));
        console.log('Number of entries in hash table: ', this.numEntries);
        console.log('load of hash table: ', Object.keys(this.hash).length);
        console.log('Number of bips: ', this.numBips);
        console.log(this.entriesArray);

        // Pre-calculate the bitVector and mask for all bipartitions in the reference tree
        this.referenceBranchBitVectors = {};
        this.referenceMissingMask = getBitVector(referenceTree.missing);
        let referencePresent = getPresentEntities(allEntities, referenceTree.missing);

        for (let bid in referenceTree.branches) if (referenceTree.branches.hasOwnProperty(bid)) {
            let b = referenceTree.branches[bid];
            // Filter the trivial branches
            if (!b.isLeaf && bid !== referenceTree.rootBranch && bid !== referenceTree.branches[referenceTree.rootBranch].right) {
                this.referenceBranchBitVectors[bid] = getCanonicalBitVector(b.entities, referencePresent);
            }
        }
    }

    static isCompatible(a, b) {
        let l = Math.max(a.bitVector.msb(), a.bitVector.msb());
        let i;

        // FIXME: checking each bit in an iteration is slow! check an 32 bit int is good
        for (i = 0; i < l; i++) {
            if (a.bitVector.get(i) && !b.bitVector.get(i) && !a.missingMask.get(i) && !b.missingMask.get(i)) {
                break;
            }
        }
        if (i === l) return true;

        for (i = 0; i < l; i++) {
            if (a.bitVector.get(i) && b.bitVector.get(i) && !a.missingMask.get(i) && !b.missingMask.get(i)) {
                break;
            }
        }
        if (i === l) return true;

        for (i = 0; i < l; i++) {
            if (!a.bitVector.get(i) && b.bitVector.get(i) && !a.missingMask.get(i) && !b.missingMask.get(i)) {
                break;
            }
        }
        if (i === l) return true;

        for (i = 0; i < l; i++) {
            if (!a.bitVector.get(i) && !b.bitVector.get(i) && !a.missingMask.get(i) && !b.missingMask.get(i)) {
                break;
            }
        }
        if (i === l) return true;

        return false;
    }

    static getTidsFromTreeVector(v) {
        return v.toArray().map(tid => 't' + tid);
    }

    // Find the entry in hash
    getEntry(bid) {
        let v = this.referenceBranchBitVectors[bid];
        let h = getBitVectorHash(v, this.size);
        if (this.hash.hasOwnProperty(h)) {
            let bucket = this.hash[h];
            for (let i = 0; i < bucket.length; i++) {
                if (v.equals(bucket[i].bitVector) && this.referenceMissingMask.equals(bucket[i].missingMask)) {
                    return bucket[i];
                }
            }
        }
        return null;
    }

    // Return the distribution of the bipartitions according to a branch bid in the reference tree
    getDistribution(bid) {
        let rEntry = this.getEntry(bid);
        let conflictEntries = [];
        let d = {
            bins: [],
            bipBins: [],
            treeToBin: {},
            hasCompatibleTree: !!rEntry
        };

        for (let i = 0; i < this.entriesArray.length; i++) {
            let e = this.entriesArray[i];

            if (!rEntry || !BipartitionList.isCompatible(rEntry, e)) {
                let j;
                for (j = 0; j < conflictEntries.length; j++) {
                    if (BipartitionList.isCompatible(e, conflictEntries[j])) {
                        // entries[j].treeVector.or(e.treeVector);
                        break;
                    }
                }

                if (j === conflictEntries.length) {
                    conflictEntries.push(e);
                    if (conflictEntries.length === numConflictsThreshold) break;
                }
            }
        }

        let sortedEntries = conflictEntries.sort((a, b) => (b.numBips - a.numBips));
        if (rEntry) {
            sortedEntries.unshift(rEntry);
        }
        d.bipBins = sortedEntries.map(e => e.numBips);
        d.bins = sortedEntries.map(e => BipartitionList.getTidsFromTreeVector(e.treeVector));
        for (let i = 0; i < d.bins.length; i++) {
            for (let j = 0; j < d.bins[i].length; j++) {
                let tid = d.bins[i][j];
                if (d.treeToBin.hasOwnProperty(tid)) {
                    d.treeToBin[tid].push(i);
                } else {
                    d.treeToBin[tid] = [i];
                }
            }
        }

        return d;
    }
}


export default BipartitionList;
