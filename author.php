<?php
/**
 * The template for displaying all single posts and attachments
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

$curauth = (isset($_GET['author_name'])) ? get_user_by('slug', $author_name) : get_userdata(intval($author));

get_header(); ?>

<?php get_template_part( 'template-parts/header-banner' ); ?>
	
	<div id="author-page" class="pad-top" role="main">
		
		<article <?php post_class( 'main-content' ) ?>>
			
			<section class="block block-no-top-pad no-bottom-pad">
			<? /*
				<h1><?= get_the_author_meta( 'display_name', get_query_var( 'author' ) ); ?></h1>
				*/ ?>
				<?php if( $curauth->user_url || $curauth->twitter || $curauth->facebook ) : ?>
					<hr class="author-spacer">
					<h3><?= get_the_author_meta( 'display_name', get_query_var( 'author' ) ); ?></h3>
				<?php endif; ?>
				
				<ul class="author-social no-bullet">
					<?php if ( $curauth->user_url ) : ?>
						<li><i class="fa fa-external-link-square" aria-hidden="true"></i><a href="<?php echo $curauth->user_url; ?>" class="profile-url"><?php _e( 'Visit my website', 'm3' ); ?></a></li>
					<?php endif; ?>
					
					<?php if ( $curauth->twitter ) : ?>
						<li><i class="fa fa-twitter" aria-hidden="true"></i><a href="<?php echo $curauth->twitter; ?>" class="social-icon twitter"><?php _e( 'Follow me on Twitter', 'm3' ); ?></a></li>
					<?php endif; ?>
					
					<?php if ( $curauth->facebook ) : ?>
						<li><i class="fa fa-facebook" aria-hidden="true"></i><a href="<?php echo $curauth->facebook; ?>" class="social-icon facebook"><?php _e( 'Follow me on Facebook', 'm3' ); ?></a></li>
					<?php endif; ?>
				</ul>
				
				<hr class="author-spacer">
			
			</section>
		
		</article>
	
	</div>
<?php get_footer();
