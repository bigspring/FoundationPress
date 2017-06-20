<?php
/**
 * The template for a single author
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

$curauth = (isset($_GET['author_name'])) ? get_user_by('slug', $author_name) : get_userdata(intval($author));

get_header(); ?>

	<header class="header-standard" role="banner">
		<div class="caption">
			<h1>
				<?= get_the_author_meta( 'first_name', get_query_var( 'author' ) ); ?>
				<?= get_the_author_meta( 'last_name', get_query_var( 'author' ) ); ?>
			</h1>
		</div>
	</header>
	
	<div id="page-author" role="main">
		
		<article <?php post_class( 'main-content' ) ?>>
						
			<?php if( $curauth->user_url) : ?>
				<p><?= $curauth->description ?></p>
			<?php endif; ?>
			
			<div class="post-thumbnail">
				<?php echo get_avatar( $curauth->ID, 360 ); ?>
			</div>
			
			<?php if( $curauth->user_url || $curauth->twitter || $curauth->facebook ) : ?>
				<ul class="no-bullet">
					<?php if ( $curauth->user_url ) : ?>
						<li>
							<i class="fa fa-external-link-square" aria-hidden="true"></i>
							<a href="<?php echo $curauth->user_url; ?>" class="profile-url">
								<?php _e( 'Visit my website', 'm3' ); ?>
							</a>
						</li>
					<?php endif; ?>
					
					<?php if ( $curauth->twitter ) : ?>
						<li>
							<i class="fa fa-twitter" aria-hidden="true"></i>
							<a href="<?php echo $curauth->twitter; ?>" class="social-icon twitter">
								<?php _e( 'Follow me on Twitter', 'm3' ); ?>
							</a>
						</li>
					<?php endif; ?>
					
					<?php if ( $curauth->facebook ) : ?>
						<li>
							<i class="fa fa-facebook" aria-hidden="true"></i>
							<a href="<?php echo $curauth->facebook; ?>" class="social-icon facebook">
								<?php _e( 'Follow me on Facebook', 'm3' ); ?>
							</a>
						</li>
					<?php endif; ?>
				</ul>
			<?php endif; ?>
			
			<section class="block">
				<h2>Check out my posts</h2>
				<?php monolith_grid('card', 'small-up-1'); ?>
			</section>
			
		</article>
	
	</div>
<?php get_footer();
