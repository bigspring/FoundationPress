<?php
/**
 * Monolith by BigSpring
 * @license MIT http://opensource.org/licenses/MIT
 */

/**
 * Init settings
 */
add_action( 'admin_init', function () {
	register_setting( 'monolith-blog-group', 'monolith_blog_page_title' );
	register_setting( 'monolith-blog-group', 'monolith_blog_page_introtext' );
	register_setting( 'monolith-blog-group', 'monolith_fallback_image' );
} );

/**
 * Produce admin menu markup for options
 */
add_action( 'admin_menu', function () {
	add_options_page( 'Blog Settings', 'Blog Settings', 'manage_options', 'monolith_blog_settings', function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( __( 'You do not have sufficient permissions to access this page.' ) );
		}
		?>
		<div class="wrap">
			<h1><?php _e( 'Blog Settings', 'monolith' ); ?></h1>
			<hr/>
			<form method="post" action="options.php">
				<?php @settings_fields( 'monolith-blog-group' ); ?>
				<?php @do_settings_sections( 'monolith-blog-group' ); ?>
				<h3><?php _e( 'Blog', 'monolith' ); ?></h3>
				<table class="form-table">
					<tr valign="top">
						<th scope="row"><label
								for="monolith_blog_page_title"><?php _e( 'Blog Page Title (*)', 'monolith' ); ?></label>
						</th>
						<td>
							<input type="text" name="monolith_blog_page_title" id="monolith_blog_page_title"
							       value="<?php echo get_option( 'monolith_blog_page_title' ) ? get_option( 'monolith_blog_page_title' ) : '' ?>"
							       size="50" placeholder="<?php _e( 'News', 'monolith' ); ?>" required>
						</td>
					</tr>
					<tr valign="top">
						<th scope="row"><label
								for="monolith_blog_page_introtext"><?php _e( 'Blog Page Introductory Text', 'monolith' ); ?></label>
						</th>
						<td>
							<textarea name="monolith_blog_page_introtext" id="monolith_blog_page_introtext" cols="50"
							          rows="3"
							          placeholder="<?php _e( 'This is my news blog.', 'monolith' ); ?>"><?php echo get_option( 'monolith_blog_page_introtext' ) ? get_option( 'monolith_blog_page_introtext' ) : '' ?></textarea>
						</td>
					</tr>
				</table>
				<h3><?php _e( 'Fallback Image', 'monolith' ); ?></h3>
				<table class="form-table">
					<tr valign="top">
						<th scope="row"><label
								for="monolith_fallback_image"><?php _e( 'Fallback Image', 'monolith' ); ?></label>
						</th>
						<td>
							<input type="hidden" name="monolith_fallback_image" id="monolith_fallback_image" class="m3-media-upload"
							       value="<?php echo get_option( 'monolith_fallback_image' ) ? get_option( 'monolith_fallback_image' ) : '' ?>"
							       size="50" placeholder="" required>
							<div class="image-preview">
								<?php if ( get_option( 'monolith_fallback_image' ) ) : ?>
									<img src="<?php echo wp_get_attachment_image_src( get_option( 'monolith_fallback_image' ), 'fp-small' )[0] ?>">
								<?php endif; ?>
							</div>
							<button type="button" class="button media-uploader">Upload image</button>
						</td>
					</tr>
				</table>
				<?php @submit_button(); ?>
			</form>
		</div>
		
		<?php
	} );
} );

/**
 * Add default site options if they don't exist in the database
 */
add_action( 'after_setup_theme', function () {
	add_option( 'monolith_blog_page_title', 'Latest News' );
	add_option( 'monolith_blog_page_introtext', '' );
	add_option( 'monolith_fallback_image', '' );
} );

add_action( 'admin_enqueue_scripts', function () {
	wp_enqueue_media();
	wp_register_script(
		'm3-media-upload',
		get_template_directory_uri() . '/assets/javascript/m3-custom/media-upload.js',
		array( 'jquery' )
	);
	wp_enqueue_script( 'm3-media-upload' );
} );
