<?php
/**
 * The list organism that calls in the list-item molecule
 *
 * @package monolith
 */
?>
<?php if ( $loop->have_posts() ) : // if we have results run the loop  ?>
	<?php do_action( 'monolith_before_builder_list', $loop ); ?>
	<!-- start ul wrapper -->
	<ul class="<?php echo $args['classes'] ?>">
		<?php while ( $loop->have_posts() ) : $loop->the_post(); ?>
			<?php include( $part ); ?>
		<?php endwhile; ?>
	</ul>
	<!-- end ul wrapper -->
	<?php do_action( 'monolith_after_builder_list', $loop ); ?>
<?php else : // otherwise show the content none organism ?>
	<?php get_template_part( 'template-parts/content-none' ); ?>
<?php endif;
