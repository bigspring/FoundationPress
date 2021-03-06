<?php
/**
 * Tabs layout file for bulder
 *
 * @package FoundationPress
 * @since Monolith 1.0.0
 */

?>

<?php if ( $loop->have_posts() ) : // if we have a loop load the tabs organism ?>
	
	<?php $count = 0; // initiate the count ?>
	
	<?php do_action( 'monolith_before_builder_tabs', $loop ); ?>
	
	<!-- the tabs navigation   -->
	<ul class="tabs" data-tabs id="builder-tabs">
		<?php while ( $loop->have_posts() ) : $loop->the_post(); ?>
			<li class="tabs-title <?php echo $count === 0 ? 'is-active' : '' ?>"><a
					href="#panel-<?php echo get_the_id() ?>"><?php the_title(); ?></a></li>
			<?php $count ++ ?>
		<?php endwhile; ?>
	</ul>
	<!-- end tab layout wrapper -->
	<?php $count = 0; // reset the count  ?>
	
	<!-- the tabs content -->
	<div class="tabs-content" data-tabs-content="builder-tabs">
		<?php while ( $loop->have_posts() ) : $loop->the_post(); ?>
			<?php include( $part ); ?>
			<?php $count ++ ?>
		<?php endwhile; ?>
	</div>
	
	<?php do_action( 'monolith_after_builder_tabs', $loop ); ?>

<?php else : // otherwise load the content-none molecule ?>
	<?php get_template_part( 'template-parts/content-none' ); ?>
<?php endif;
