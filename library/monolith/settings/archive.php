<?php
/**
 * Monolith by BigSpring
 * @license MIT http://opensource.org/licenses/MIT
 */

/**
 * Init settings
 */
add_action( 'admin_init', function () {
	$post_types = apply_filters( 'monolith_settings_post_types', get_post_types() );
	
	foreach ( $post_types as $post_type ) {
		//register_setting( 'monolith-archive-group', 'monolith_archive_cpt_title_' . $post_types );
		register_setting( 'monolith-archive-group', 'monolith_archive_cpt_introtext_' . $post_type );
		register_setting( 'monolith-archive-group', 'monolith_archive_cpt_image_' . $post_type );
	}
	
} );

/**
 * Produce admin menu markup for options
 */
add_action( 'admin_menu', function () {
	add_options_page( 'Archive Settings', 'Archive Settings', 'manage_options', 'monolith_archive_settings', function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'You do not have sufficient permissions to access this page.' ) );
		}
		
		$post_types = apply_filters( 'monolith_settings_post_types', get_post_types() );
		?>
		<div class="wrap">
			<h1><?php _e( 'Archive Settings', 'monolith' ); ?></h1>
			<hr/>
			<form method="post" action="options.php">
				<?php @settings_fields( 'monolith-archive-group' ); ?>
				<?php @do_settings_sections( 'monolith-archive-group' ); ?>
				
				<?php foreach ( $post_types as $post_type ) : ?>
					<h3><?php _e( 'Post Type: ' . $post_type, 'monolith' ); ?></h3>
					<table class="form-table">
						<tr valign="top">
							<th scope="row">
								<label for="monolith_archive_cpt_introtext_<?php echo $post_type ?>">
									<?php _e( 'Introductory Text', 'monolith' ); ?>
								</label>
							</th>
							<td>
							<textarea
								name="monolith_archive_cpt_introtext_<?php echo $post_type ?>"
								id="monolith_archive_cpt_introtext_<?php echo $post_type ?>"
								cols="50" rows="3"
								placeholder="<?php _e( 'This is my ' . $post_type . ' archive.', 'monolith' ); ?>"><?php echo get_option( 'monolith_archive_cpt_introtext_' . $post_type ) ? get_option( 'monolith_archive_cpt_introtext_' . $post_type ) : '' ?></textarea>
							</td>
						</tr>
						<tr valign="top">
							<th scope="row"><label
									for="monolith_archive_cpt_image"><?php _e( 'Fallback Image', 'monolith' ); ?></label>
							</th>
							<td>
								<input type="hidden" name="monolith_archive_cpt_image_<?php echo $post_type ?>"
								       id="monolith_archive_cpt_image_<?php echo $post_type ?>" class="m3-media-upload"
								       value="<?php echo get_option( 'monolith_archive_cpt_image_' . $post_type ) ? get_option( 'monolith_archive_cpt_image_' . $post_type ) : '' ?>"
								       size="50" placeholder="" required>
								<div class="image-preview">
									<?php if ( get_option( 'monolith_archive_cpt_image_' . $post_type ) ) : ?>
										<img
											src="<?php echo wp_get_attachment_image_src( get_option( 'monolith_archive_cpt_image_' . $post_type ), 'fp-small' )[0] ?>">
									<?php endif; ?>
								</div>
								<button type="button" class="button media-uploader">Upload image</button>
							</td>
						</tr>
					</table>
				<?php endforeach; ?>
				
				<?php @submit_button(); ?>
			</form>
		</div>
		
		<?php
	} );
} );

/**
 * Add default site options if they don't exist in the database
 */
add_action( 'init', function () {
	$post_types = apply_filters( 'monolith_settings_post_types', get_post_types() );
	
	foreach ( $post_types as $post_type ) {
		add_option( 'monolith_archive_cpt_introtext_' . $post_type, '' );
		add_option( 'monolith_archive_cpt_image_' . $post_type, '' );
	}
}, 100 );

/**
 * Remove post types from Archive settings.
 *
 * This hook is for removing default WP post types only, to  cut down on clutter. To remove additional CPTs
 * per-project, copy this filter to a suitable file and change $cpts_to_remove to suit your needs.
 */
add_filter( 'monolith_settings_post_types', function ( $post_types ) {
	$cpts_to_remove = array( 'post', 'page', 'attachment', 'revision', 'nav_menu_item', 'custom_css', 'customize_changeset', 'acf-field-group', 'acf-field' );
	foreach ( $cpts_to_remove as $cpt_to_remove ) {
		unset( $post_types[ $cpt_to_remove ] );
	}
	
	return $post_types;
} );
