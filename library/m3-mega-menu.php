<?php

// Register the new mega menu innit
// --------------------------------

	function m3_mega_menu_setup() {
	    register_nav_menus( array(
	        'mega_menu' => 'Mega Menu'
	    ) );
	}
	add_action( 'after_setup_theme', 'm3_mega_menu_setup' );


	function m3_mega_menu_init() {
	    $location = 'mega_menu';
	    $css_class = 'has-mega-menu';
	    $locations = get_nav_menu_locations();
	    if ( isset( $locations[ $location ] ) ) {
	        $menu = get_term( $locations[ $location ], 'nav_menu' );
	        if ( $items = wp_get_nav_menu_items( $menu->name ) ) {
	            foreach ( $items as $item ) {
	                if ( in_array( $css_class, $item->classes ) ) {
	                    register_sidebar( array(
	                        'id'   => 'mega-menu-widget-area-' . $item->ID,
	                        'name' => $item->title . ' - Mega Menu',
	                    ) );
	                }
	            }
	        }
	    }
	}
	add_action( 'widgets_init', 'm3_mega_menu_init' );