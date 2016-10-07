<?php
/**
 * The template for displaying the footer
 *
 * Contains the closing of the "off-canvas-wrap" div and all content after.
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

?>

		</section>
		<div id="footer-container">
			<footer id="footer">
				<?php do_action( 'foundationpress_before_footer' ); ?>


					<div class="row">
						<div class="columns medium-6">

				      <!-- start the footer menu -->
				      <ul class="menu">
				        <!-- static list item for copyright / date -->
				        <li>&copy; <?= date( 'Y' ); ?> <?php bloginfo( 'name' ); ?></li>

				        <!-- start menu items -->
				        <?php // args for the custom footer menu
				        $args = array(
				          'container'       => false, // remove nav container
				          'items_wrap'      => '%3$s', // remove ul
				          'container_class' => '', // class of container
				          'menu'            => '', // menu name
				          'menu_class'      => 'footer-menu', // adding custom nav class
				          'theme_location'  => 'footer', // where it's located in the theme
				          'before'          => '', // before each link <a>
				          'after'           => '', // after each link </a>
				          'link_before'     => '', // before each link text
				          'link_after'      => '', // after each link text
				          'depth'           => 5, // limit the depth of the nav
				          'fallback_cb'     => false,
				        );
				        
				        wp_nav_menu( $args );
				        ?>
				        <!-- end menu items -->
				      </ul>
				      <!-- end the footer menu -->

						</div><!-- columns -->

						<div class="columns medium-6">
							<?php get_template_part('template-parts/social-media-icons') ?>
						</div>

					</div>


				<?php do_action( 'foundationpress_after_footer' ); ?>
			</footer>
		</div>

		<?php do_action( 'foundationpress_layout_end' ); ?>

<?php if ( get_theme_mod( 'wpt_mobile_menu_layout' ) == 'offcanvas' ) : ?>
		</div><!-- Close off-canvas wrapper inner -->
	</div><!-- Close off-canvas wrapper -->
</div><!-- Close off-canvas content wrapper -->
<?php endif; ?>


<?php wp_footer(); ?>
<?php do_action( 'foundationpress_before_closing_body' ); ?>

</body>
</html>
