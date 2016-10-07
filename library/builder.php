<?php

namespace Bigspring\Monolith;

/**
 * The builder class used for building layouts based on a set of arguments and a custom loop if required
 * @license MIT http://opensource.org/licenses/MIT
 * @package monolith
 */
class Builder {
	private $layouts_path;
	private $layout = 'list';
	private $query = null;
	private $args = array();
	private $loop = null;
	private $default_args = array( // default arguments
		'classes'       => '',
		'size'          => BLOCK_GRID_SIZE,
		'has_image'     => true,
		'has_caption'   => true,
		'has_title'     => true,
		'has_summary'   => true,
		'has_readmore'  => true,
		'has_titlelink' => true,
		'has_date'      => true,
		'part'          => 'snippet'
	);
	private $part = null;
	
	public function __construct( $layout = null, $args = null, $query = null ) {
		
		$default_layout = 'snippets';
		$default_part   = 'snippet';
		
		$this->layouts_path = get_template_directory() . '/builder-parts/';
		$this->parts_path   = get_template_directory() . '/template-parts/';
		
		$this->layout = $layout ? $layout : array(
			'layout' => $default_layout,
			'part'   => $default_part
		); // get the layout or default to list
		
		if ( ! array_key_exists( 'layout', $this->layout ) ) {
			$this->layout['layout'] = $default_layout;
		}
		
		if ( ! array_key_exists( 'part', $this->layout ) ) {
			$this->layout['part'] = $default_part;
		}
		
		$this->query = $query ? $query : null; // set the query object if we have one
		$this->args  = $args ? $args : array(); // set our args if we have any
		
		$this->_set_loop(); // set the loop object
		$this->_set_args(); // set any custom arguments we have
		
		echo $this->_render(); // render the view
		wp_reset_query();
	}
	
	/**
	 * Sets the loop object to be the supplied one, or the global wp_query object if not
	 * @return bool
	 */
	private function _set_loop() {
		if ( ! $this->query ) {
			global $wp_query;
			$this->loop = $wp_query;
		} else {
			$this->loop = new WP_Query( $this->query );
		}
		
		return true;
	}
	
	/**
	 * Sets up the arguments by merging in supplied args with default args, then applies any custom rules required
	 * @return bool
	 */
	private function _set_args() {
		$this->args            = array_merge( $this->default_args, $this->args ); // merge in any custom arguments we have
		$this->args['classes'] = 'builder builder-' . $this->layout['layout'] . ' ' . $this->args['classes']; // we do this to add all dynamically generated classes
		
		return true;
	}
	
	/**
	 * Echos the full layout
	 * @return bool
	 */
	private function _render() {
		$loop         = &$this->loop;
		$args         = &$this->args;
		$layout       = $this->layout;
		$layouts_path = $this->layouts_path;
		$part         = ( array_key_exists( 'part', $layout ) ) ? $layout['part'] : $this->part;
		$part         = $this->parts_path . $part . '.php';
		global $post;
		
		ob_start();
		
		if ( ! file_exists( $this->_get_layout_file() ) ) { // if the file doesn't exist, handle the error
			if ( ENVIRONMENT === 'development' ) { // if we're in development mode then show the error
				return $this->_raise_alert( 'The layout file "' . $this->layout . '"could not be found' );
			} else { // otherwise default to the list layout
				$this->layout = 'list';
			}
		}
		
		include( $this->_get_layout_file() );
		
		return ob_get_clean();
	}
	
	/**
	 * Function for returning an alert on failure
	 *
	 * @param $message
	 *
	 * @return string
	 */
	private function _raise_alert( $message ) {
		// only display error when in development environment
		if ( ENVIRONMENT === 'development' ) {
			return '<p class="alert-box alert">' . $message . '</p>';
		}
	}
	
	private function _get_layout_file() {
		return $this->layouts_path . $this->layout['layout'] . '.php';
	}
}
