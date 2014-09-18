'use strict';

var React = require("react/addons");
var ReactLink = require("react/lib/ReactLink");
var Preconditions = require("./utils/preconditions");
var DeepFreeze = require("./utils/deepFreeze");

var Atom = require("./atom/atom");
var AtomReactContext = require("./atomReactContext");
var AtomReactStore = require("./atomReactStore");
var AtomCursor = require("./atom/atomCursor");
var AtomAsyncValue = require("./atom/atomAsyncUtils").AtomAsyncValue;



function shallowEqualProps(props, nextProps) {
    if (props === nextProps) {
        return true;
    }

    if ( Object.keys(props).length !== Object.keys(nextProps).length ) {
        return false;
    }

    var key;
    for (key in props) {
        if ( props[key] !== nextProps[key] ) return false;
    }
    return true;
}

function dereferenceCursors(props) {
    var dereferenced = {};
    Object.keys(props).forEach(function(key) {
        if ( props[key] instanceof AtomCursor ) {
            dereferenced[key] = props[key].value();
        } else {
            dereferenced[key] = props[key];
        }
    });
    return dereferenced;
}


var WithPureRenderMixin = {
    shouldComponentUpdate: function(nextProps, nextState) {
        try {
            var dereferencedProps = dereferenceCursors(nextProps);
            if ( !this.previouslyRenderedDereferencedProps ) {
                this.previouslyRenderedDereferencedProps = dereferencedProps;
                return true;
            }
            var shouldUpdate = !shallowEqualProps(dereferencedProps,this.previouslyRenderedDereferencedProps);
            if ( shouldUpdate ) {
                //console.debug("["+this.getDisplayName()+"] should update!");
                this.previouslyRenderedDereferencedProps = dereferencedProps;
            } else {
                //console.debug("["+this.getDisplayName()+"] should not update!")
            }
            return shouldUpdate;
        } catch (e) {
            console.error("Error in 'shouldComponentUpdate' for component ",this.getDisplayName(), e.message, e.stack);
            return true;
        }
    }
};
exports.WithPureRenderMixin = WithPureRenderMixin;



var WithCursorLinkingMixin = {
    linkCursor: function(cursor) {
        return new ReactLink(
            cursor.getOrElse(undefined),
            function setCursorNewValue(value) {
                cursor.set(value);
            }
        );
    }
};
exports.WithCursorLinkingMixin = WithCursorLinkingMixin;


var WithTransactMixin = {
    contextTypes: {
        atom: React.PropTypes.instanceOf(Atom).isRequired
    },
    transact: function(tasks) {
        this.context.atom.transact(tasks);
    }
};
exports.WithTransactMixin = WithTransactMixin;


var WithEventPublisherMixin = {
    contextTypes: {
        publishEvent: React.PropTypes.func.isRequired
    },
    publish: function(event) {
        Preconditions.checkCondition(event instanceof AtomReactEvent,"Event fired is not an AtomReactEvent! " + event);
        this.context.publishEvent(event);
    }
};
exports.WithEventPublisherMixin = WithEventPublisherMixin;


var WithEventListenerMixin = {
    contextTypes: {
        addEventListener: React.PropTypes.func.isRequired,
        removeEventListener: React.PropTypes.func.isRequired
    },
    addEventListener: function(listener) {
        this.context.addEventListener(listener);
    },
    removeEventListener: function(listener) {
        this.context.removeEventListener(listener);
    },
    componentDidMount: function() {
        if ( this.listenToEvents ) {
            this.context.addEventListener(this.listenToEvents);
        }
    },
    componentWillUnmount: function() {
        if ( this.listenToEvents ) {
            this.context.removeEventListener(this.listenToEvents);
        }
    }
};
exports.WithEventListenerMixin = WithEventListenerMixin;


function addMixins(config) {
    config.mixins = config.mixins || [];
    config.mixins.push(WithPureRenderMixin);
    config.mixins.push(WithCursorLinkingMixin);
    config.mixins.push(WithTransactMixin);
    config.mixins.push(WithEventPublisherMixin);
    config.mixins.push(WithEventListenerMixin);
}



function createPureClass(name,component) {
    Preconditions.checkHasValue(name,"The name attribute is mandatory: this helps to debug compoennts!")
    Preconditions.checkHasValue(component,"The config attribute is mandatory!")
    Preconditions.checkCondition(!component.initialState,"Pure components should not have any local state, and thus no initialState attribute");
    Preconditions.checkCondition(!component.shouldComponentUpdate,"shouldComponentUpdate is already implemented for you");
    Preconditions.checkCondition(component.render,"render() must be implemented");
    Preconditions.checkCondition(component.propTypes,"propTypes must be provided: this is the component interface!");

    // Unfortunately, the displayName can't be infered from the variable name during JSX compilation :(
    // See http://facebook.github.io/react/docs/component-specs.html#displayname
    component.displayName = name;
    // Because React's displayName is not easy to obtain from a mixin (???)
    component.getDisplayName = function() { return name };


    addMixins(component);

    return React.createClass(component);
}
exports.createPureClass = createPureClass;

var PropTypes = {
    isCursor: React.PropTypes.instanceOf(AtomCursor).isRequired,
    isAsyncValue: React.PropTypes.instanceOf(AtomAsyncValue).isRequired
};
exports.PropTypes = PropTypes;




function newContext() {
    return new AtomReactContext();
}
exports.newContext = newContext;


function newStore(name,description) {
    return new AtomReactStore.AtomReactStore(name,description);
}
exports.newStore = newStore;

function newRouter(description) {
    return new AtomReactStore.AtomReactRouter(description);
}
exports.newRouter = newRouter;

exports.Preconditions = Preconditions
exports.DeepFreeze = DeepFreeze



var AtomReactEvent = function(eventName,eventData) {
    Preconditions.checkHasValue(eventName,"Event name is mandatory");
    this.name = eventName;
    this.data = eventData;
    this.timestamp = new Date().getTime();
};
exports.Event = AtomReactEvent;