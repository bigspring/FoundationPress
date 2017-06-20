<?php
/**
 * Monolith by BigSpring
 * @license MIT http://opensource.org/licenses/MIT
 */

/**
 * Init settings
 */
add_action( 'admin_init', function () {
	register_setting( 'monolith-archive-group', 'monolith_archive_page_introtext' );
} );

/**
 * Produce admin menu markup for options
 */
add_action( 'admin_menu', function () {
	add_options_page( 'Archive Settings', 'Archive Settings', 'manage_options', 'monolith_archive_settings', function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'You do not have sufficient permissions to access this page.' ) );
		}
		
		$taxonomies = get_taxonomies();
		$post_types = get_post_types();
		
		?>
		<div class="wrap">
			<h1><?php _e( 'Archive Settings', 'monolith' ); ?></h1>
			<hr/>
			<form method="post" action="options.php">
				<?php @settings_fields( 'monolith-archive-group' ); ?>
				<?php @do_settings_sections( 'monolith-archive-group' ); ?>
				<h3><?php _e( 'Archive', 'monolith' ); ?></h3>
				<table class="form-table">
					<tr valign="top">
						<th scope="row"><label
								for="monolith_archive_page_introtext"><?php _e( 'Archive Page Introductory Text', 'monolith' ); ?></label>
						</th>
						<td>
							<textarea name="monolith_archive_page_introtext" id="monolith_archive_page_introtext" cols="50" rows="3"
							          placeholder="<?php _e( 'This is my news archive.', 'monolith' ); ?>"><?php echo get_option( 'monolith_archive_page_introtext' ) ? get_option( 'monolith_archive_page_introtext' ) : '' ?></textarea>
						</td>
					</tr>
				</table>
				<?php @submit_button(); ?>
			</form>
		</div>
		
		<?php
	} );
} );

if ( ! function_exists( 'set_default_site_options' ) ) {
	/**
	 * Add default site options if they don't exist in the database
	 */
	add_action( 'after_setup_theme', function () {
		$taxonomies = get_taxonomies();
		$post_types = get_post_types();
		
		foreach ($taxonomies as $taxonomy) {
			
		}
		add_option( 'monolith_archive_page_introtext', '' );
	} );
}


