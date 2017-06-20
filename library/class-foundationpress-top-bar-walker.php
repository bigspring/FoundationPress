<?php
/**
 * Customize the output of menus for Foundation top bar
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

 // Big thanks to Brett Mason (https://github.com/brettsmason) for the awesome walker

 if ( ! class_exists( 'Foundationpress_Top_Bar_Walker' ) ) :
 class Foundationpress_Top_Bar_Walker extends Walker_Nav_Menu {

 	function start_lvl( &$output, $depth = 0, $args = array() ) {
 			$indent = str_repeat("\t", $depth);
            $output .= "\n$indent<ul class=\"dropdown menu vertical\" data-toggle>\n";
 	}

	 function start_el( &$output, $object, $depth = 0, $args = array(), $current_object_id = 0 ) {
		 $item_html = '';
		 parent::start_el( $item_html, $object, $depth, $args );

		 $item_description = null;

		 // Add a description to the menu item anchor if it exists
		 if ( $object->description ) {
			 $item_description = '<span class="link-description">' . $object->description . '</span>';
			 $item_anchor      = "<a href=\"{$object->url}\">{$object->title}{$item_description}</a>";
			 $item_html        = preg_replace( '/<a[^>]*>(.*)<\/a>/iU', $item_anchor, $item_html );
		 }

		 //$classes = empty( $object->classes ) ? array() : (array) $object->classes;

		 /*if ( in_array( 'label', $classes ) ) {
			 $output .= '<li class="divider"></li>';
			 $item_html = preg_replace( '/<a[^>]*>(.*)<\/a>/iU', '<label>$1</label>', $item_html );
		 }

		 if ( in_array( 'divider', $classes ) ) {
			 $item_html = preg_replace( '/<a[^>]*>( .* )<\/a>/iU', '', $item_html );
		 }*/

		 $output .= $item_html;
	 }
 }


 if ( ! class_exists( 'Foundationpress_Mobile_Walker' ) ) :
 class Foundationpress_Mobile_Walker extends Walker_Nav_Menu {
 	function start_lvl( &$output, $depth = 0, $args = array() ) {
 			$indent = str_repeat("\t", $depth);
 			$output .= "\n$indent<ul class=\"vertical nested menu\">\n";
 	}
 }
 endif;

endif;
