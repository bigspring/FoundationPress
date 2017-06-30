<?php

namespace Bigspring\Monolith;

/**
 * The builder class used for building layouts based on a set of arguments and a custom loop if required
 * @license MIT http://opensource.org/licenses/MIT
 * @package monolith
 */
class Builder {
	
	private $layouts_path = 'builder-parts';
	private $parts_path = 'template-parts';
	private $layout_file_path;
	private $part_file_path;
	private $loop;
	private $cache_name;
	private $cache_timeout = MINUTE_IN_SECONDS * 15;
	private $cached_query = false;
	private $parts; // useless but will never stop being funny
	
	private $layout = array(
		'layout' => 'snippets',
		'part'   => 'snippet'
	);
	
	private $query = array();
	private $args = array();
	
	private $default_args = array(
		'part'          => 'snippet',
		'classes'       => '',
		'size'          => '',
		'has_image'     => true,
		'has_caption'   => true,
		'has_title'     => true,
		'has_summary'   => true,
		'has_readmore'  => true,
		'has_titlelink' => true,
		'has_date'      => true
	);
	
	public function __construct( $layout = array(), $args = array(), $query = false, $cache_name = false ) {
		
		$this->layout = array_merge( $this->layout, $layout );
		
		if ( ! $this->set_paths() ) { // if we don't have the files, error
			return $this->raise_alert( 'The template file could not be found' );
		}
		
		$this->query = $query; // set the query object if we have one
		$this->args  = $args; // set our args if we have any
		
		// Cache handling
		// --------------
		// The cache timeout can be set for a whole project using the filter below.
		// The cache name is also passed so exceptions can be made for specific builder calls.
		$this->cache_name    = $cache_name;
		$this->cache_timeout = apply_filters( 'monolith_builder_cache_timeout', $this->cache_timeout, $cache_name );
		$this->get_cached_query();
		
		$this->set_loop(); // set the loop object
		$this->set_args(); // set any custom arguments we have
		
		echo $this->render(); // render the view
		wp_reset_query();
	}
	
	private function get_cached_query() {
		if ( $this->cache_name ) {
			$this->cached_query = get_transient( $this->cache_name );
			
			return true;
		}
		
		return false;
	}
	
	/**
	 * Sets the loop object to be the supplied one, or the global wp_query object if not
	 */
	private function set_loop() {
		if ( $this->cached_query ) {
			$this->loop = $this->cached_query;
		} else {
			if ( $this->query ) {
				$this->loop = new \WP_Query( $this->query );
			} else {
				global $wp_query;
				$this->loop = $wp_query;
			}
			
			if ( $this->cache_name ) {
				set_transient( $this->cache_name, $this->loop, $this->cache_timeout );
			}
		}
	}
	
	/**
	 * Sets up the arguments by merging in supplied args with default args, then applies any custom rules required
	 * @return bool
	 */
	private function set_args() {
		$this->args = array_merge( $this->default_args, $this->args );
		
		// Layout will potentially be a path so ensure a valid class name is used
		$classes = sanitize_text_field( $this->layout['layout'] );
		
		$this->args['classes'] = 'builder builder-' . $classes . ' ' . $this->args['classes'];
		
		return true;
	}
	
	/**
	 * Echos the full layout
	 * @return bool
	 */
	private function render() {
		$loop         = $this->loop;
		$args         = $this->args;
		$layout       = $this->layout_file_path;
		$layouts_path = $this->layouts_path;
		$part         = $this->part_file_path;
		$parts_path   = $this->parts_path;
		
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
		$dir_path  = DIRECTORY_SEPARATOR . $this->layouts_path . DIRECTORY_SEPARATOR;
		$file_path = $dir_path . $this->layout['layout'] . '.php';
		
		if ( file_exists( STYLESHEETPATH . $file_path ) ) { // check if the layout exists in the child theme
			$this->layouts_path     = STYLESHEETPATH . $dir_path;
			$this->layout_file_path = STYLESHEETPATH . $file_path;
		} elseif ( file_exists( TEMPLATEPATH . $file_path ) ) { // otherwise use the parent theme
			$this->layouts_path     = TEMPLATEPATH . $dir_path;
			$this->layout_file_path = TEMPLATEPATH . $file_path;
		} else {
			return false;
		}
		
		// part file
		$dir_path = DIRECTORY_SEPARATOR . $this->parts_path . DIRECTORY_SEPARATOR;;
		$file_path = $dir_path . $this->layout['part'] . '.php';
		
		if ( file_exists( STYLESHEETPATH . $file_path ) ) { // check if the part exists in the child theme
			$this->parts_path     = STYLESHEETPATH . $dir_path;
			$this->part_file_path = STYLESHEETPATH . $file_path;
		} elseif ( file_exists( TEMPLATEPATH . $file_path ) ) { // otherwise use the parent theme
			$this->parts_path     = TEMPLATEPATH . $dir_path;
			$this->part_file_path = TEMPLATEPATH . $file_path;
		} else {
			return false;
		}
		
		return true;
		
	}
}
