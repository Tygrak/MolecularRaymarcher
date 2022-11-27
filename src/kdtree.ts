import { vec3, vec4 } from "gl-matrix";
import { Atom } from "./atom";
import { GetAtomType } from "./atomDatabase";

export class KdTree {
    tree: vec4[];

    constructor(atoms: Atom[]) {
        this.tree = new Array<vec4>(atoms.length);
        this.BuildTree(atoms, 0, 0);
        // atoms.map(a => vec4.fromValues(a.x, a.y, a.z, 0));
    }

    private BuildTree(atoms: Atom[], position: number, depth: number) {
        if (atoms.length === 0) {
            return;
        }
        if (atoms.length === 1) {
            const atom = atoms[0];
            this.tree[position] = vec4.fromValues(atom.x, atom.y, atom.z, GetAtomType(atom).number);
            return;
        }
        const dim = depth % 3;
        atoms.sort((a, b) => a.GetPosition()[dim] - b.GetPosition()[dim]);
        const median = Math.floor(atoms.length / 2);
        const atom = atoms[median];
        this.tree[position] = vec4.fromValues(atom.x, atom.y, atom.z, GetAtomType(atom).number);
        this.BuildTree(atoms.slice(0, median), this.Left(position), depth + 1);
        this.BuildTree(atoms.slice(median + 1), this.Right(position), depth + 1);
    }

    public Nearest(atom: Atom) {
        let curr = 0;
        let i = 0;
        while (this.Left(curr) != -1) {
            const dim = i % 3;
            i++;
            if (this.Right(curr) == -1) {
                curr = this.Left(curr);
                continue;
            }
            if (atom.GetPosition()[dim] > this.tree[curr][dim]) {
                curr = this.Right(curr);
            } else {
                curr = this.Left(curr);
            }
        }
        let bestDistance = vec3.distance(vec3.fromValues(this.tree[curr][0], this.tree[curr][1], this.tree[curr][2]), atom.GetPosition());
        let bestNode = curr;
        i--;
        while (this.Parent(curr) != -1) {
            const dim = i % 3;
            i--;
            const prev = curr;
            curr = this.Parent(curr);
            const distance = vec3.distance(vec3.fromValues(this.tree[curr][0], this.tree[curr][1], this.tree[curr][2]), atom.GetPosition());
            if (distance < bestDistance) {
                bestDistance = distance;
                bestNode = curr;
            }
            let subDim = dim;
            let subtreeCurr = curr;
            if (this.Right(curr) == prev && this.Left(curr) != -1) {
                subtreeCurr = this.Left(curr);
            } else if (this.Right(curr) != -1) {
                subtreeCurr = this.Right(curr);
            } else {
                continue;
            }
            while (subtreeCurr != -1 && Math.abs(this.tree[subtreeCurr][subDim]-atom.GetPosition()[subDim]) < bestDistance && this.Left(subtreeCurr) != -1) {
                subDim = (subDim+1) % 3;
                const distance = vec3.distance(vec3.fromValues(this.tree[subtreeCurr][0], this.tree[subtreeCurr][1], this.tree[subtreeCurr][2]), atom.GetPosition());
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestNode = subtreeCurr;
                }
                if (this.Right(subtreeCurr) == -1) {
                    subtreeCurr = this.Left(subtreeCurr);
                    continue;
                }
                if (atom.GetPosition()[subDim] > this.tree[subtreeCurr][subDim]) {
                    subtreeCurr = this.Right(subtreeCurr);
                } else {
                    subtreeCurr = this.Left(subtreeCurr);
                }
            }
        }
        return {atom: this.tree[bestNode], distance: bestDistance};
    }

    /*public Nearest(atom: Atom, maxNodes: number, maxDistance?: number) {
        let i;
        let result;
  
        let bestNodes = [];
  
        function nearestSearch(node: number) {
            var bestChild,
            dimension = dimensions[node.dimension],
            ownDistance = metric(point, node.obj),
            linearPoint = {},
            linearDistance,
            otherChild,
            i;
  
            function saveNode(node, distance) {
                bestNodes.push([node, distance]);
                if (bestNodes.size() > maxNodes) {
                    bestNodes.pop();
                }
            }
    
            for (i = 0; i < dimensions.length; i += 1) {
                if (i === node.dimension) {
                    linearPoint[dimensions[i]] = point[dimensions[i]];
                } else {
                    linearPoint[dimensions[i]] = node.obj[dimensions[i]];
                }
            }
    
            linearDistance = metric(linearPoint, node.obj);

            if (node.right === null && node.left === null) {
                if (bestNodes.size() < maxNodes || ownDistance < bestNodes.peek()[1]) {
                    saveNode(node, ownDistance);
                }
                return;
            }

            if (node.right === null) {
                bestChild = node.left;
            } else if (node.left === null) {
                bestChild = node.right;
            } else {
                if (point[dimension] < node.obj[dimension]) {
                    bestChild = node.left;
                } else {
                    bestChild = node.right;
                }
            }

            nearestSearch(bestChild);

            if (bestNodes.size() < maxNodes || ownDistance < bestNodes.peek()[1]) {
                saveNode(node, ownDistance);
            }

            if (bestNodes.size() < maxNodes || Math.abs(linearDistance) < bestNodes.peek()[1]) {
                if (bestChild === node.left) {
                    otherChild = node.right;
                } else {
                    otherChild = node.left;
                }
                if (otherChild !== null) {
                    nearestSearch(otherChild);
                }
            }
        }
  
        if (maxDistance) {
            for (i = 0; i < maxNodes; i += 1) {
                bestNodes.push([null, maxDistance]);
            }
        }
  
        if(self.root)
            nearestSearch(self.root);
  
        result = [];
  
        for (i = 0; i < Math.min(maxNodes, bestNodes.content.length); i += 1) {
            if (bestNodes.content[i][0]) {
                result.push([bestNodes.content[i][0].obj, bestNodes.content[i][1]]);
            }
        }
        return result;
    };*/

    public Left(i: number) {
        const result = 2*Math.round(i)+1;
        if (result >= this.tree.length || i < 0) {
            return -1;
        }
        return result;
    }

    public Right(i: number) {
        const result = 2*Math.round(i)+2;
        if (result >= this.tree.length || i < 0) {
            return -1;
        }
        return result;
    }

    public Parent(i: number) {
        const result = Math.floor(Math.round(i-1)/2);
        if (result >= this.tree.length || i < 0) {
            return -1;
        }
        return result;
    }
}

/*from collections import namedtuple
from operator import itemgetter
from pprint import pformat

class Node(namedtuple("Node", "location left_child right_child")):
    def __repr__(self):
        return pformat(tuple(self))

def kdtree(point_list, depth: int = 0):
    if not point_list:
        return None

    k = len(point_list[0])  # assumes all points have the same dimension
    # Select axis based on depth so that axis cycles through all valid values
    axis = depth % k

    # Sort point list by axis and choose median as pivot element
    point_list.sort(key=itemgetter(axis))
    median = len(point_list) // 2

    # Create node and construct subtrees
    return Node(
        location=point_list[median],
        left_child=kdtree(point_list[:median], depth + 1),
        right_child=kdtree(point_list[median + 1 :], depth + 1),
    )

def main():
    """Example usage"""
    point_list = [(7, 2), (5, 4), (9, 6), (4, 7), (8, 1), (2, 3)]
    tree = kdtree(point_list)
    print(tree)

if __name__ == "__main__":
    main()*/