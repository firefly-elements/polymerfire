import "@polymer/polymer/polymer-legacy.js";
import { Polymer } from "@polymer/polymer/lib/legacy/polymer-fn.js";
import { FirebaseCommonBehavior } from "./firebase-common-behavior";
import "@firebase/firestore";
import { AppStorageBehavior } from "@polymer/app-storage/app-storage-behavior";

/** @polymerBehavior Polymer.FirebaseFirestoreDocumentBehavior */
export const FirebaseFirestoreDocumentBehaviorImpl = {
	properties: {
		db: {
			type: Object,
			computed: "__computeDb(app)"
		},

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

		const key = value && value.id;
		const pattern = /(\/.*)\//;
		const match = path.match(pattern);

		const onlyPath = match[1];

		const docRef = this.db.collection(onlyPath).doc(key);

		try {
			const getDocRef = await docRef.get();
			let result;
			if (getDocRef.exists) {
				result = await docRef.update(value);
			} else {
				result = await docRef.set(value, { merge: true });
			}

			return result;
		} catch (error) {
			console.log("Error getting document:", error);
		}
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

		return db.doc(path);
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
		return path && pieces.indexOf("") < 0 && pieces.length % 2 == 0;
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

	setData: function(data, options) {
		return this.ref.set(data, options);
	},

	updateData: function(data) {
		return this.ref.update(data);
	}
};

/** @polymerBehavior */
export const FirebaseFirestoreDocumentBehavior = [
	AppStorageBehavior,
	FirebaseCommonBehavior,
	FirebaseFirestoreDocumentBehaviorImpl
];
