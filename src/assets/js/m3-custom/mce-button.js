// magic code to add a tinymce dropdown for shortcodes in WP post editor
// thanks to http://www.wpexplorer.com/wordpress-tinymce-tweaks/ for the help!

(function() {
	tinymce.PluginManager.add('my_mce_button', function( editor, url ) {
		editor.addButton( 'my_mce_button', {
			text: 'Shortcodes',
			icon: false,
			type: 'menubutton',
			menu: [

				//Blockquote Shortcode
				{
					text: 'Blockquote',
					onclick: function() {
						editor.windowManager.open( {
							title: 'Insert Blockquote',
							body: [
								{
									type: 'textbox',
									name: 'textboxQuote',
									label: 'Quote',
									value: '',
									multiline: true,
									minWidth: 400,
									minHeight: 200,
								},
								{
									type: 'textbox',
									name: 'textboxCite',
									label: 'Cite',
									value: '',
									multiline: true,
									minWidth: 400,
								},
							],
							onsubmit: function( e ) {
								editor.insertContent( '[blockquote cite="' + e.data.textboxCite + '" ]' + e.data.textboxQuote + '[/blockquote]');
							}
						});
					}
				}, // end block quote

				//Button Shortcode
				// ====================================
				{
					text: 'Button',
					minWidth: 300,
					onclick: function() {
						editor.windowManager.open( {
							title: 'Insert Button Shortcode',
							body: [

								// button text
								{
									type: 'textbox',
									name: 'textboxText',
									label: 'Button Text',
									value: 'Learn More',
									multiline: false,
									minWidth: 400
								},

								// button URL
								{
									type: 'textbox',
									name: 'textboxUrl',
									label: 'URL',
									value: 'http://',
									multiline: false,
									minWidth: 400,
								},

								{
									type: 'listbox',
									name: 'listboxType',
									label: 'Type',
									'values': [
										{text: 'Default', value: ''},
										{text: 'Primary', value: 'primary'},
										{text: 'Secondary', value: 'secondary'}	,
										{text: 'Success', value: 'success'},
										{text: 'Alert', value: 'alert'},
										{text: 'Warning', value: 'warning'},
									]
								},

								{
									type: 'listbox',
									name: 'listboxSize',
									label: 'Size',
									'values': [
										{text: 'Default', value: ''},
										{text: 'Tiny', value: 'tiny'},
										{text: 'Small', value: 'small'}	,
										{text: 'Medium', value: ''},
										{text: 'Large', value: 'large'},
										{text: 'Expanded', value: 'expanded'},
										{text: 'Small Expanded', value: 'small expanded'},
										{text: 'Large Expanded', value: 'large expanded'},
									]
								},



							],
							onsubmit: function( e ) {
								editor.insertContent( '[button text="' + e.data.textboxText + '" URL="' + e.data.textboxUrl + '" Type="' + e.data.listboxType + '" Size="' + e.data.listboxSize + '"]');
							}
						});
					}
				},

				{
					text: 'Pages',
					menu: [

						// Grid
						// ====================================
						{
							text: 'Grid',
							minWidth: 300,
							onclick: function() {
								editor.windowManager.open( {
									title: 'Insert Pages Block Grid Shortcode',
									body: [

										{
											type: 'textbox',
											name: 'pageIds',
											label: 'Page IDs (comma delimited list)',
											value: '',
											multiline: true,
											minWidth: 300,
											minHeight: 100
										},
										
										{
											type: 'listbox',
											name: 'listboxcardsnippet',
											label: 'Card or Snippet',
											value: 'cardsnippet',
											'values': [
												{text: 'Card', value: 'card'},
												{text: 'Snippet', value: 'snippet'},
											]
										},

										{
											type: 'listbox',
											name: 'listboxSizeSmall',
											label: 'Mobile',
											value: 'small-up-1',
											'values': [
												{text: '1 column', value: 'small-up-1'},
												{text: '2 columns', value: 'small-up-2'},
												{text: '3 columns', value: 'small-up-3'},
												{text: '4 columns', value: 'small-up-4'}
											]
										},

										{
											type: 'listbox',
											name: 'listboxSizeMedium',
											label: 'Tablet',
											value: 'medium-up-2',
											'values': [
												{text: '1 column', value: 'medium-up-1'},
												{text: '2 columns', value: 'medium-up-2'}	,
												{text: '3 columns', value: 'medium-up-3'},
												{text: '4 columns', value: 'medium-up-4'}
											]
										},

										{
											type: 'listbox',
											name: 'listboxSizeLarge',
											label: 'Desktop',
											value: 'large-up-2', // pre-select the value
											'values': [
												{text: '1 column', value: 'large-up-1'},
												{text: '2 columns', value: 'large-up-2'},
												{text: '3 columns', value: 'large-up-3'},
												{text: '4 columns', value: 'large-up-4'}
											]
										},

										{
											type: 'listbox',
											name: 'listboxOrder',
											label: 'Ordering',
											value: 'menu_order', // pre-select the value
											'values': [
												{text: 'Title', value: 'title'},
												{text: 'Menu Order', value: 'menu_order'},
												{text: 'Date', value: 'date'},
												{text: 'Random', value: 'rand'}
											]
										},

										{
											type: 'checkbox',
											name: 'checkboxImage',
											label: 'Featured Image',
											checked: true
										},

										{
											type: 'checkbox',
											name: 'checkboxTitle',
											label: 'Page Title',
											checked: false
										},

										{
											type: 'checkbox',
											name: 'checkboxExcerpt',
											label: 'Page Summary',
											checked: false
										}

									],
									onsubmit: function( e ) {
										editor.insertContent( '[pages ids="' + e.data.pageIds + '" size="' + e.data.listboxSizeSmall + ' ' + e.data.listboxSizeMedium + ' ' + e.data.listboxSizeLarge + '" layout="grid" part="'+ e.data.listboxcardsnippet+'" image="'+ e.data.checkboxImage+'" title="'+ e.data.checkboxTitle+'" excerpt="'+ e.data.checkboxExcerpt+'" orderby="'+ e.data.listboxOrder+'"]');
									}
								});
							}
						}, // end pages block grid

						// List
						// ====================================
						{
							text: 'List',

							onclick: function() {
								editor.windowManager.open( {
									title: 'Insert Childpages List Shortcode',
									minWidth: 300,
									body: [
										{
											type: 'textbox',
											name: 'pageIds',
											label: 'Page IDs (comma delimited list)',
											value: '',
											multiline: true,
											minWidth: 300,
											minHeight: 100
										},

										{
											type: 'listbox',
											name: 'listboxListTypes',
											label: 'List Type',
											'values': [
												{text: 'Default', value: 'disc'},
												{text: 'Unstyled', value: 'no-bullet'},
												{text: 'Inline', value: 'inline-list'},
												{text: 'Chevrons', value: 'chevron'}	,
												{text: 'Two Column', value: 'list-two-column'},
												{text: 'Carets', value: 'caret'},
												{text: 'Ticks', value: 'tick'}
											]
										},

										{
											type: 'listbox',
											name: 'listboxOrder',
											label: 'Ordering',
											value: 'menu_order', // pre-select the value
											'values': [
												{text: 'Title', value: 'title'},
												{text: 'Menu Order', value: 'menu_order'},
												{text: 'Date', value: 'date'},
												{text: 'Random', value: 'rand'}
											]
										},


									],
									onsubmit: function( e ) {
										editor.insertContent( '[pages ids="' + e.data.pageIds + '" layout="list" class="' + e.data.listboxListTypes + '" orderby="'+ e.data.listboxOrder+'"]');
									}
								});
							}
						},

					]
				},


				//child pages
				{
					text: 'Child Pages',
					menu: [

						// Accordions
						// ====================================
						{
							text: 'Accordion',
							minWidth: 300,
							onclick: function() {
								editor.insertContent( '[childpages layout="accordion" part="accordion-item"]');
							}
						},

						// Grid
						// ====================================
						{
							text: 'Grid',
							minWidth: 300,
							onclick: function() {
								editor.windowManager.open( {
									title: 'Insert Block Grid Shortcode',
									body: [

										{
											type: 'listbox',
											name: 'listboxcardsnippet',
											label: 'Card or Snippet',
											value: 'cardsnippet',
											'values': [
												{text: 'Card', value: 'card'},
												{text: 'Snippet', value: 'snippet'},
											]
										},

										{
											type: 'listbox',
											name: 'listboxSizeSmall',
											label: 'Mobile',
											value: 'small-up-1',
											'values': [
												{text: '1 column', value: 'small-up-1'},
												{text: '2 columns', value: 'small-up-2'},
												{text: '3 columns', value: 'small-up-3'},
												{text: '4 columns', value: 'small-up-4'}
											]
										},

										{
											type: 'listbox',
											name: 'listboxSizeMedium',
											label: 'Tablet',
											value: 'medium-up-2',
											'values': [
												{text: '1 column', value: 'medium-up-1'},
												{text: '2 columns', value: 'medium-up-2'}	,
												{text: '3 columns', value: 'medium-up-3'},
												{text: '4 columns', value: 'medium-up-4'}
											]
										},

										{
											type: 'listbox',
											name: 'listboxSizeLarge',
											label: 'Desktop',
											value: 'large-up-2', // pre-select the value
											'values': [
												{text: '1 column', value: 'large-up-1'},
												{text: '2 columns', value: 'large-up-2'},
												{text: '3 columns', value: 'large-up-3'},
												{text: '4 columns', value: 'large-up-4'}
											]
										},

										{
											type: 'listbox',
											name: 'listboxOrder',
											label: 'Ordering',
											value: 'menu_order', // pre-select the value
											'values': [
												{text: 'Title', value: 'title'},
												{text: 'Menu Order', value: 'menu_order'},
												{text: 'Date', value: 'date'},
												{text: 'Random', value: 'rand'}
											]
										},

										{
											type: 'checkbox',
											name: 'checkboxImage',
											label: 'Display Featured Image',
											checked: true
										},

										{
											type: 'checkbox',
											name: 'checkboxTitle',
											label: 'Display Page Title',
											checked: true
										},

										{
											type: 'checkbox',
											name: 'checkboxExcerpt',
											label: 'Display Excerpt',
											checked: false
										}

									],
									onsubmit: function( e ) {
										editor.insertContent( '[childpages size="' + e.data.listboxSizeSmall + ' ' + e.data.listboxSizeMedium + ' ' + e.data.listboxSizeLarge + '" layout="grid" part="'+ e.data.listboxcardsnippet+'" image="'+ e.data.checkboxImage+'" title="'+ e.data.checkboxTitle+'" excerpt="'+ e.data.checkboxExcerpt+'" orderby="'+ e.data.listboxOrder+'"]');
									}
								});
							}
						}, // end grid list



						// List
						// ====================================
						{
							text: 'List',

							onclick: function() {
								editor.windowManager.open( {
									title: 'Insert Childpages List Shortcode',
									minWidth: 300,
									body: [
										{
											type: 'listbox',
											name: 'listboxListTypes',
											label: 'List Type',
											'values': [
												{text: 'Default', value: 'disc'},
												{text: 'Unstyled', value: 'no-bullet'},
												{text: 'Chevrons', value: 'chevron'}	,
												{text: 'Carets', value: 'caret'},
												{text: 'Ticks', value: 'tick'},
												{text: 'Two Column', value: 'list-two-column'},
											]
										},

										{
											type: 'listbox',
											name: 'listboxOrder',
											label: 'Ordering',
											value: 'menu_order', // pre-select the value
											'values': [
												{text: 'Title', value: 'title'},
												{text: 'Menu Order', value: 'menu_order'},
												{text: 'Date', value: 'date'},
												{text: 'Random', value: 'rand'}
											]
										},


									],
									onsubmit: function( e ) {
										editor.insertContent( '[childpages layout="list" part="list-item" class="' + e.data.listboxListTypes + '" orderby="'+ e.data.listboxOrder+'"]');
									}
								});
							}
						},

						// Tabs
						// ====================================
						{
							text: 'Tabs',
							minWidth: 300,
							onclick: function() {
								editor.insertContent( '[childpages layout="tabs" part="tab"]');
							}
						}

					]
				},

				//List Shortcode
				// ====================================

				{
					text: 'List',
					onclick: function() {
						editor.windowManager.open( {
							title: 'Insert list style',
							body: [
								{
									type: 'listbox',
									name: 'listboxListTypes',
									label: 'List Type',
									'values': [
										{text: 'Chevrons', value: 'chevron'},
										{text: 'Carets', value: 'caret'},
										{text: 'Ticks', value: 'tick'}
									]
								},
							],
							onsubmit: function( e ) {
								editor.insertContent( '[list type="' + e.data.listboxListTypes + '" ]<ul><li>List Item</li></ul>[/list]');
							}
						});
					}
				}, // end list shortcode

				// Address Shortcode
				// ====================================
				/*
					WE DON'T REALLY USE THIS PLUS THE VERTICAL LAYOUT DOESN'T WORK
					SIMON P MILES 20/06/17
				{
					text: 'Address',
					onclick: function() {
						editor.windowManager.open( {
							title: 'Insert address',
							body: [
								{
									type: 'listbox',
									name: 'addressListTypes',
									label: 'Address Type',
									'values': [
										{text: 'Vertical', value: 'vertical'},
										{text: 'Horizontal', value: 'horizontal'}
									]
								},
							],
							onsubmit: function( e ) {
								editor.insertContent( '[monolith_address type="' + e.data.addressListTypes + '" ]');
							}
						});
					}
				}, // end address shortcode
				*/

				// Intro shortcode
				// ====================================
				{
					text: 'Intro',
					onclick: function() {
						editor.windowManager.open( {
							title: 'Insert intro Shortcode',
							body: [
								{
									type: 'textbox',
									name: 'textboxIntro',
									label: 'Intro Text',
									value: '',
									multiline: true,
									minWidth: 300,
									minHeight: 100
								},
							],
							onsubmit: function( e ) {
								editor.insertContent( '[intro]' + e.data.textboxIntro + '[/intro]');
							}
						});
					}
				},

				// Accordion shortcode
				// ====================================
				{
					text: 'Accordion',
					onclick: function() {
						editor.windowManager.open( {
							title: 'Insert Accordion Shortcode',
							body: [

								{
									type: 'textbox',
									name: 'accordionTitle',
									label: 'Accordion Panel Title',
									value: '',
									multiline: true,
									minWidth: 300,
									minHeight: 50
								},

								{
									type: 'textbox',
									name: 'accordionContent',
									label: 'Accordion Panel Text',
									value: '',
									multiline: true,
									minWidth: 300,
									minHeight: 100
								},

							],
							onsubmit: function( e ) {
								editor.insertContent( '[accordion][accordion_panel title="' + e.data.accordionTitle + '"]' + e.data.accordionContent + '[/accordion_panel][/accordion]');
							}
						});
					}
				},


				// Panel Shortcode
				// ====================================

				{
					text: 'Callout',
					onclick: function() {
						editor.windowManager.open( {
							title: 'Choose callout style',
							body: [
								{
									type: 'listbox',
									name: 'listboxListTypes',
									label: 'Callout Type',
									'values': [
										{text: 'Default', value: ''},
										{text: 'Primary', value: 'primary'},
										{text: 'Secondary', value: 'secondary'},
										{text: 'Success', value: 'success'},
										{text: 'Warning', value: 'warning'},
										{text: 'Alert', value: 'alert'},
									]
								},
							],
							onsubmit: function( e ) {
								editor.insertContent( '[callout type="' + e.data.listboxListTypes + '" ]<p>Callout Content</p>[/callout]');
							}
						});
					}
				}, // end list shortcode

/*
				// Stretch Block Shortcode
				// ====================================
				THIS WAS AN EXPERIMENT WHICH WE NEVER ENDED UP USING SO COMMENTED OUT FOR NOW
				SIMON P MILES 20/06/17
				{
					text: 'Stretch Band',
					onclick: function() {
						editor.windowManager.open( {
							title: 'Choose Stretch Band Style',
							body: [
								{
									type: 'listbox',
									name: 'listboxListTypes',
									label: 'Stretch Band Type',
									'values': [
										{text: 'Default', value: ''},
										{text: 'Primary', value: 'primary'},
										{text: 'Secondary', value: 'secondary'},
										{text: 'Success', value: 'success'},
										{text: 'Warning', value: 'warning'},
										{text: 'Alert', value: 'alert'},
									]
								},
							],
							onsubmit: function( e ) {
								editor.insertContent( '[stretch_band type="' + e.data.listboxListTypes + '" ]<p>Stretch Band </p>[/stretch_band]');
							}
						});
					}
				}, // end stretch block shortcode
*/


				// Foundation Columns
				// ====================================
				{
					text: 'Columns',
					minWidth: 300,
					onclick: function() {
						editor.insertContent( '[row][foundation_columns columns="insert your column widths here"]Content goes here[/foundation_columns][foundation_columns columns="insert your column widths here"]Content goes here[/foundation_columns][/row]');
					}
				}

			]

		});

	});
})();
