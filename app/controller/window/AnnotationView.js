/**
 *  Edirom Online
 *  Copyright (C) 2014 The Edirom Project
 *  http://www.edirom.de
 *
 *  Edirom Online is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Edirom Online is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Edirom Online.  If not, see <http://www.gnu.org/licenses/>.
 */
Ext.define('EdiromOnline.controller.window.AnnotationView', {

    extend: 'Ext.app.Controller',

    views: [
        'window.AnnotationView'
    ],

    init: function() {
        this.control({
            'annotationView': {
                afterlayout : this.onAfterLayout,
                showAnnotation: this.onShowAnnotation,
                loadAnnotations: this.onLoadAnnotations,
                loadParticipantSingleContent: this.onLoadParticipantSingleContent
            },
            'annotationView  button[action=openAll]': {
                click: this.onOpenAllParticipants
            },
            'annotationView  button[action=closeAll]': {
                click: this.onCloseAllParticipants
            }
        });
    },

    onAfterLayout: function(view) {

        return;

        var me = this;

        if(view.initialized) return;
        view.initialized = true;
    },

    onShowAnnotation: function(view, uri) {

        window.doAJAXRequest('data/xql/getAnnotationText.xql',
            'GET', 
            {
                uri: uri
            },
            Ext.bind(function(response){
                view.setContent(response.responseText);
            }, this)
        );
        
        window.doAJAXRequest('data/xql/getAnnotationMeta.xql',
            'GET', 
            {
                uri: uri
            },

            Ext.bind(function(response){
                view.setMeta(response.responseText);
            }, this)
        );
        
        window.doAJAXRequest('data/xql/getAnnotationPreviews.xql',
            'GET', 
            {
                uri: uri
            },
            Ext.bind(function(response){
                var data = Ext.JSON.decode(response.responseText);
                view.setPreview(data['participants']);
            }, this)
        );
        
    },
    
    onOpenAllParticipants: function(btn, e) {
        var me = this;
        var view = btn.view;


        // Are there allready opened windows from the last action?
        if (view.closeAllButton.windows != null) {
            this.onCloseAllParticipants(view.closeAllButton);
        }

        var linkController = this.application.getController('LinkController');
        
        window.doAJAXRequest('data/xql/getAnnotationOpenAllUris.xql',
            'GET', 
            {
                uri: view.uri,
                annotId: view.activeSingleAnnotation
            },
            Ext.bind(function(response){
                var participantUris = response.responseText;
                var windows = linkController.loadLink(participantUris, {sort:'sortGrid', useExisting: false, onlyExisting: false, sortIncludes: [view.window]});
                view.closeAllButton.windows = windows;
                view.closeAllButton.enable();
            }, me)
        );
    },
    
    onCloseAllParticipants: function(btn, e) {
        var me = this;
        btn.disable();

        // Cleanup already closed windows
        if (btn.windows) {
            btn.windows.each(function (win) {
                if (!Ext.WindowManager.get(win.id)) {
                    btn.windows.remove(win);
                }
            });
        }

        btn.windows.each(function (win) {
            if (win)
                win.close();
        });

        btn.windows = null;
    },

    onLoadAnnotations: function(view) {
        this.loadAnnotationsAndCreateComponents(view);
    },

    onLoadParticipantSingleContent: function(view) {
        this.loadParticipantSingleContent(view);
    },

    loadAnnotationsAndCreateComponents: function(view) {
        var me = this;

        // Show loading mask while loading data
        view.setLoading('Loading annotations...');

        window.doAJAXRequest(
            'data/xql/getAnnotations.xql',
            'GET',
            {
                uri: view.uri
            },
            Ext.bind(function(response) {
                var data = Ext.JSON.decode(response.responseText);

                // Store the loaded data
                view.data = data;
                view.annotations = data.annotations;
                view.annotationsLoaded = true;

                if(typeof(debug) !== 'undefined' && debug !== null && debug) {
                    console.log('view: AnnotationView: ajax callback');
                    console.log(view);
                    console.log(data);
                    console.log(data.annotations);
                    console.log(data.emptyFields);
                }

                // Now create the list and store that depend on the loaded data
                me.createListAndStore(view, data.annotations, me.getStoreFieldsDefinition(view), data.emptyFields);

                // Add the list to the card layout at index 0
                view.insert(0, view.list);

                // Set the list as the active item initially
                view.getLayout().setActiveItem(view.list);

                // Hide loading mask
                view.setLoading(false);

                // Fire the event to notify that annotations are loaded
                view.fireEvent('annotationsLoaded', view, view.uri, data);

                console.log('Annotations loaded and components created');
                console.log(view);
            }, me),
            Ext.bind(function(response) {
                // Error handling
                view.setLoading(false);
                Ext.Msg.alert('Error', 'Failed to load annotations');
            }, me)
        );
    },

    createStore: function(view) {
        var me = this;

        view.listStore = Ext.create('Ext.data.Store', {
            //model: 'EdiromOnline.model.Annotation',
            fields: me.getStoreFieldsDefinition(view),
            autoLoad: false
        });

        view.listStore.getProxy().extraParams = {
            uri: view.uri,
            lang: getPreference('application_language'),
            edition: EdiromOnline.getApplication().activeEdition
        };

        return view.listStore;
    },

    createListAndStore: function(view, annotations, storeFields, emptyFields) {
        var me = this;

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('view: AnnotationView: createListAndStore');
            console.log(view.annotations);
            console.log(storeFields);
            console.log(emptyFields);
        }

        // Create list Store
        view.listStore = Ext.create('Ext.data.Store', {
            fields: storeFields,
            autoLoad: false,
            data: annotations
        });

        // Create the annotation list
        view.list = Ext.create('Ext.grid.Panel', {
            store: view.listStore,
            title: getLangString('view.window.AnnotationView_Title'),
            bodyBorder: false,
            border: '0 0 0 0',
            cls: 'annotationList',
            features: [{
                ftype: 'filters',
                encode: false,
                local: true,
                filters: []
            }],
            columns: view.getColumns(storeFields, emptyFields)
        });

        // Add event listener for double click
        view.list.on('itemdblclick', view.onItemDblClicked, view);

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('view: AnnotationView: createList final');
            console.log(view.list);
        }
    },

    getStoreFieldsDefinition: function(view) {
        var me = this;

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('view: AnnotationView: getStoreFieldsDefinition:');
            console.log(view);
            console.log(view.data);
            console.log(view.annotations);
        }

        // initialise fields variable, setting default fields
        var fields = [
            'id',
            'sigla',
            // create an integer field with the name pos for sorting in document-order
            {
                name: 'pos',
                type: 'int'
            }
        ];

        // Only proceed if data is loaded
        if (!view.data || !view.data.fields) {
            return fields; // Return default fields if data not loaded yet
        }

        // create fields config
        // get the existing field names from the above fields array
        var existingFieldNames = fields.map(field =>
            typeof field === 'string' ? field : field.name
        );

        // Iterate over data.fields and add missing ones to fields variable
        view.data.fields.forEach(fieldName => {
            if (!existingFieldNames.includes(fieldName)) {
                    fields.push(fieldName);
            }
        });

        return fields;
    },

    loadStore: function(view) {
        var me = this;
        if(view.listStore) {
            view.listStore.load();
        }
    },

    loadParticipantSingleContent: function(view) {
        var me = this;

        var contEl = view.el.getById(view.id + '_annotationParticipantsSingle');
        var previewTxtData = contEl.query('input.previewTxtData');

        if (previewTxtData.length == 0) return;

        var txtData = previewTxtData[0].value;
        var uri = txtData.match(/uri:(.*)__\$\$__/)[1];
        var id = txtData.match(/__\$\$__participantId:(.*)/)[1];

        window.doAJAXRequest('data/xql/getReducedDocument.xql?uri=' + uri + '&selectionId=' + id + '&subtreeRoot=div&idPrefix=' + view.id + '_',
            'GET',
            {},
            Ext.bind(function(response){
                var contEl = view.el.getById(view.id + '_annotationParticipantsSingle');
                var txtBox = new Ext.Element(contEl.query('div.txtBox')[0]);
                txtBox.update(response.responseText);

                contEl.query('#' + view.id + '_' + id)[0].scrollIntoView(txtBox);
            }, me)
        );
    }
});
