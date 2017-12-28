<?php
/**
 * The block grid organism
 *
 * @package monolith
 */
?>

<?php if ( $loop->have_posts() ) : // if we have a loop load the block grid organism ?>
	
	<?php do_action( 'monolith_before_builder_grid', $loop ); ?>
	
	<!-- start the block grid ul -->
	<div class="<?php echo $args['classes']; ?> grid-x grid-margin-x" data-equalizer data-equalize-on="medium">
		<?php while ( $loop->have_posts() ) : $loop->the_post(); ?>
			<div class="cell">
				<?php include( $part ); ?>
			</div>
		<?php endwhile; ?>
	</div>
	<!-- end the block grid ul -->
	
	<?php do_action( 'monolith_after_builder_grid', $loop ); ?>

<?php else : // otherwise load the content-none molecule ?>
	<?php include( $parts_path . 'content-none.php' ); ?>
<?php endif; ?>
