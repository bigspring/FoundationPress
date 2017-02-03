<?php

namespace Bigspring\Monolith;

/**
 * The builder class used for building layouts based on a set of arguments and a custom loop if required
 * @license MIT http://opensource.org/licenses/MIT
 * @package monolith
 */
class Builder {
	private $layouts_path;
	private $layout;
	private $query;
	private $args;
	private $loop = null;
	private $cache;
	private $cached_query = false;
	private $cache_timeout = 3600;
	
	private $default_args = array(
		'classes'       => '',
		'size'          => '',
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
	
	public function __construct( $layout = array(), $args = array(), $query = null, $cache = false ) {
		
		$default_layout = 'snippets';
		$default_part   = 'snippet';
		
		$this->layouts_path = 'builder-parts';
		$this->parts_path   = 'template-parts';
		
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
		
		if ( !$this->set_paths() ) { // if we don't have the files, error
			return $this->raise_alert('The template file could not be found');
		}
		
		$this->query = $query; // set the query object if we have one
		$this->args  = $args; // set our args if we have any
		
		$this->cache = $cache;
		
		if ($this->cache && $this->get_cached_query()) {
			$this->cache_timeout = MINUTE_IN_SECONDS * 5;
		}
		
		$this->set_loop(); // set the loop object
		$this->set_args(); // set any custom arguments we have
		
		echo $this->render(); // render the view
		wp_reset_query();
	}
	
	private function get_cached_query() {
		if ($this->cache) {
			$this->cached_query = get_transient($this->cache);
			return true;
		}
		
		return false;
	}
	
	/**
	 * Sets the loop object to be the supplied one, or the global wp_query object if not
	 */
	private function set_loop() {
		if ($this->cached_query) {
			$this->loop = $this->cached_query;
		} else {
			if ( $this->query ) {
				$this->loop = new \WP_Query( $this->query );
			} else {
				global $wp_query;
				$this->loop = $wp_query;
			}
			
			if ($this->cache) {
				set_transient($this->cache, $this->loop, $this->cache_timeout);  // store a new transient for 15 mins
			}
		}
	}
	
	/**
	 * Sets up the arguments by merging in supplied args with default args, then applies any custom rules required
	 * @return bool
	 */
	private function set_args() {
		$this->args            = array_merge( $this->default_args, $this->args ); // merge in any custom arguments we have
		$this->args['classes'] = 'builder builder-' . $this->layout['layout'] . ' ' . $this->args['classes']; // we do this to add all dynamically generated classes
		
		return true;
	}
	
	/**
	 * Echos the full layout
	 * @return bool
	 */
	private function render() {
		$loop           = &$this->loop;
		$args           = &$this->args;
		$layout         = $this->layout_file_path;
		$layouts_path   = $this->layouts_path;
		$part           = $this->part_file_path;
		$parts_path     = $this->parts_path;
		
		global $post;
		
		ob_start();
		include( $this->layout_file_path );
		return ob_get_clean();
	}
	
	/**
	 * Function for returning an alert on failure
	 *
	 * @param $message
	 *
	 * @return string
	 */
	private function raise_alert( $message ) {
		// only display error when in development environment
		if ( ENVIRONMENT === 'development' ) {
			echo '<p class="alert-box alert">' . $message . '</p>';
		}
	}
	
	/**
	 * Sets the diretory and file paths for the layout and part files, dependent on child themes
	 * @return bool
	 */
	private function set_paths() {
		
		// layout file
		$dir_path = DIRECTORY_SEPARATOR . $this->layouts_path . DIRECTORY_SEPARATOR;
		$file_path = $dir_path . $this->layout['layout'] . '.php';
		
		if( file_exists( STYLESHEETPATH . $file_path)) { // check if the layout exists in the child theme
			$this->layouts_path = STYLESHEETPATH . $dir_path;
			$this->layout_file_path = STYLESHEETPATH . $file_path;
		} elseif ( file_exists( TEMPLATEPATH . $file_path)) { // otherwise use the parent theme
			$this->layouts_path = TEMPLATEPATH . $dir_path;
			$this->layout_file_path = TEMPLATEPATH . $file_path;
		} else {
			return false;
		}
		
		// part file
		$dir_path = DIRECTORY_SEPARATOR . $this->parts_path . DIRECTORY_SEPARATOR;;
		$file_path = $dir_path . $this->layout['part'] . '.php';
		
		if( file_exists( STYLESHEETPATH . $file_path)) { // check if the part exists in the child theme
			$this->parts_path = STYLESHEETPATH . $dir_path;
			$this->part_file_path = STYLESHEETPATH . $file_path;
		} elseif ( file_exists( TEMPLATEPATH  . $file_path)) { // otherwise use the parent theme
			$this->parts_path = TEMPLATEPATH . $dir_path;
			$this->part_file_path = TEMPLATEPATH . $file_path;
		} else {
			return false;
		}
		
		return true;
		
	}
}
