import "@polymer/polymer/polymer-legacy.js";
import { Polymer } from "@polymer/polymer/lib/legacy/polymer-fn.js";
import { AppStorageBehavior } from "@polymer/app-storage/app-storage-behavior";
import { FirebaseCommonBehavior } from "./firebase-common-behavior.js";
import "@firebase/firestore";

/** @polymerBehavior Polymer.FirebaseFirestoreCollectionBehavior */
export const FirebaseFirestoreCollectionBehaviorImpl = {
  properties: {
    db: {
      type: Object,
      computed: "__computeDb(app)"
    },

    /**
     * [`firebase.firestore.Collection`](https://firebase.google.com/docs/reference/js/firebase.firestore.CollectionReference#properties)
     * object computed by the following parameters.
     */
    ref: {
      type: Object,
      computed: "__computeRef(db, path, disabled)",
      observer: "__refChanged"
    },

    /**
     * Path to a Firebase root or endpoint. N.B. `path` is case sensitive.
     * @type {string|null}
     */
    path: {
      type: String,
      value: null,
      observer: "__pathChanged"
    },
    /**
     * When true, Firebase listeners won't be activated. This can be useful
     * in situations where elements are loaded into the DOM before they're
     * ready to be activated (e.g. navigation, initialization scenarios).
     * @type {Boolean}
     */
    disabled: {
      type: Boolean,
      value: false
    },

    /**
     * Reference to the unsubscribe function for turning a listener off.
     * @type {Function}
     * @private
     */
    _unsubscribe: {
      type: Object
    }
  },

  observers: ["__onlineChanged(online)"],

  /**
   * Set the firebase value.
   * @return {!firebase.Promise<void>}
   */
  _setFirebaseValue: async function(path, value) {
    this._log("Setting Firebase value at", path, "to", value);
    this.isChanged = false;
    const firestorePathValueObject = this._getKeyandValue(path);

    let result;
    let newEntry;
    if (value !== Object(value)) {
      var field = firestorePathValueObject.field;
      newEntry = new Object();
      newEntry[field] = value;
    } else {
      newEntry = value;
    }
    const docRef = this.db.doc(firestorePathValueObject.actualPath);
    result = docRef
      .update(newEntry)
      .then(() => (this.isChanged = true))
      .catch(err => console.error(err));
    return result;
  },

  _getKeyandValue: function(path) {
    var pathArray = path.substring(1, path.length).split("/");
    var actualPath = null;
    var field = null;

    if (pathArray.length % 2 !== 0) {
      let pathArrayClone = [...pathArray];
      actualPath = this._createPathEvenArray(pathArray);
      field = pathArrayClone.pop();
      return { actualPath, field };
    } else {
      actualPath = pathArray.join("/");
      return { actualPath };
    }
  },

  _createPathEvenArray(arr) {
    arr.splice(-1, 1);
    var actualPath = arr.join("/");
    return actualPath;
  },

  __computeDb: function(app) {
    return app ? app.firestore() : null;
  },

  __computeRef: function(db, path) {
    if (
      db == null ||
      path == null ||
      !this.__pathReady(path) ||
      this.disabled
    ) {
      return null;
    }
    if (this.subcollection) {
      return db._collectionGroup(path);
    }
    return db.collection(path);
  },

  __parseQueryParams: function(stringParams) {
    if (
      stringParams == null ||
      typeof stringParams != "string" ||
      stringParams.length == 0
    ) {
      return null;
    }

    return stringParams.split("&&").map(function(eachParam) {
      return eachParam.split(",");
    });
  },

  /**
   * Override this method if needed.
   * e.g. to detach or attach listeners.
   */
  __refChanged: function(ref, oldRef) {
    return;
  },

  __pathChanged: function(path, oldPath) {
    if (!this.disabled && !this.valueIsEmpty(this.data)) {
      this.syncToMemory(function() {
        this.data = this.zeroValue;
        this.__needSetData = true;
      });
    }
  },

  __pathReady: function(path) {
    if (!path) {
      return false;
    }
    var pieces = path.split("/");
    if (!pieces[0].length) {
      pieces = pieces.slice(1);
    }
    return path && pieces.indexOf("") < 0 && pieces.length % 2 == 1;
  },

  __onlineChanged: function(online) {
    if (!this.ref) {
      return;
    }

    if (online) {
      this.db.goOnline();
    } else {
      this.db.goOffline();
    }
  },

  addData: function(doc) {
    return this.ref.add(doc);
  },

  setData: function(docPath, data, options) {
    return this.ref.doc(docPath).set(data, options);
  },

  updateData: function(docPath, data) {
    return this.ref.doc(docPath).update(data);
  },

  removeData: function(docPath) {
    return this.ref.doc(docPath).delete();
  }
};

/** @polymerBehavior */
export const FirebaseFirestoreBehavior = [
  AppStorageBehavior,
  FirebaseCommonBehavior,
  FirebaseFirestoreCollectionBehaviorImpl
];
