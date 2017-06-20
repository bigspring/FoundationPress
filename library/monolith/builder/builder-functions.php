<?php

/**
 * Run the Monolith builder.
 *
 * @param array $layout Which layout template to use
 * @param array $args Builder arguments
 * @param null $query WP_Query arguments
 * @param bool $cache_name Cache name
 */
function monolith_build( $layout = array(), $args = array(), $query = array(), $cache_name = false ) {
	new Bigspring\Monolith\Builder( $layout, $args, $query, $cache_name );
}

function monolith_grid( $part, $classes = '', $args = array(), $query = array(), $cache_name = false ) {
	
	if ( $classes ) { // ensure we set the right builder arg for the size parameter
		$args['classes'] = $classes;
	}
	
	new Bigspring\Monolith\Builder( array( 'layout' => 'grid', 'part' => $part ), $args, $query, $cache_name );
}

function monolith_accordion( $args = array(), $query = array(), $cache_name = false ) {
	new Bigspring\Monolith\Builder( array(
		'layout' => 'accordion',
		'part'   => 'accordion-item'
	), $args, $query, $cache_name );
}

function monolith_list( $classes = '', $args = array(), $query = array(), $cache_name = false ) {
	if ( $classes ) { // ensure we set the right builder arg for the size parameter
		$args['classes'] = $classes;
	}
	new Bigspring\Monolith\Builder( array( 'layout' => 'list', 'part' => 'list-item' ), $args, $query, $cache_name );
}

function monolith_tabs( $args = null, $query = array(), $cache_name = false ) {
	new Bigspring\Monolith\Builder( array( 'layout' => 'tabs', 'part' => 'tab-item' ), $args, $query, $cache_name );
}
