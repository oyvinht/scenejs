/**
 * Backend that manages scene flags. These are pushed and popped by "flags" nodes
 * to enable/disable features for the subgraph. An important point to note about these
 * is that they never trigger the generation of new GLSL shaders - flags are designed
 * to switch things on/of with minimal overhead.
 *
 * @private
 */
SceneJS._flagsModule = new (function() {

    var idStack = new Array(255);
    var flagStack = new Array(255);
    var stackLen = 0;
    var dirty;

    var DEFAULT_FLAGS = {
        fog: true,          // Fog enabled
        colortrans : true,  // Effect of colortrans enabled
        picking : true,     // Picking enabled
        clipping : true,    // User-defined clipping enabled
        enabled : true,     // Node not culled from traversal
        visible : true,     // Node visible - when false, everything happens except geometry draw
        transparent: false
    };

    this.flags = {}; // Flags at top of flag stack

    /** Creates flag set by inheriting flags off top of stack where not overridden
     */
    function createFlags(flags) {
        var newFlags = {};
        var topFlags = (stackLen > 0) ? flagStack[stackLen - 1] : DEFAULT_FLAGS;
        var flag;
        for (var name in flags) {
            if (flags.hasOwnProperty(name)) {
                newFlags[name] = flags[name];
            }
        }
        for (var name in topFlags) {
            if (topFlags.hasOwnProperty(name)) {
                flag = newFlags[name];
                if (flag == null || flag == undefined) {
                    newFlags[name] = topFlags[name];
                }
            }
        }
        return newFlags;
    }

    /* Make fresh flag stack for new render pass, containing default flags
     * to enable/disable various things for subgraph
     */
    var self = this;
    SceneJS._eventModule.addListener(
            SceneJS._eventModule.SCENE_COMPILING,
            function() {
                self.flags = DEFAULT_FLAGS;
                stackLen = 0;
                dirty = true;
            });

    /* Export flags when renderer needs them - only when current set not exported (dirty)
     */
    SceneJS._eventModule.addListener(
            SceneJS._eventModule.SHADER_RENDERING,
            function() {
                if (dirty) {
                    if (stackLen > 0) {
                        SceneJS._renderModule.setFlags(idStack[stackLen - 1], self.flags);
                    } else {
                        SceneJS._renderModule.setFlags();
                    }
                    dirty = false;
                }
            });

    this.preVisitNode = function(node) {
        var attr = node._attr;
       if (attr.flags) {            
            this.flags = createFlags(attr.flags);
            idStack[stackLen] = attr.id;
            flagStack[stackLen] = this.flags;
            stackLen++;
            dirty = true;
        }
    };

    this.postVisitNode = function(node) {
        if (stackLen > 0 && idStack[stackLen - 1] === node._attr.id) {
            stackLen--;
            this.flags = (stackLen > 0) ? flagStack[stackLen - 1] : DEFAULT_FLAGS;
            dirty = true;
        }
    };
})();

