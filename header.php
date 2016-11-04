<?php
/**
 * The template for displaying the header
 *
 * Displays all of the head element and everything up until the "container" div.
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

?>
<!doctype html>
<html class="no-js" <?php language_attributes(); ?> >
	<head>
		<meta charset="<?php bloginfo( 'charset' ); ?>" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<?php wp_head(); ?>
	</head>
	<body <?php body_class(); ?>>
	<?php do_action( 'foundationpress_after_body' ); ?>

	<?php if ( get_theme_mod( 'wpt_mobile_menu_layout' ) == 'offcanvas' ) : ?>
	<div class="off-canvas-wrapper">
		<div class="off-canvas-wrapper-inner" data-off-canvas-wrapper>
		<?php get_template_part( 'template-parts/mobile-off-canvas' ); ?>
	<?php endif; ?>

	<?php do_action( 'foundationpress_layout_start' ); ?>

	<header id="masthead" class="site-header" role="banner">
		<div class="title-bar" data-responsive-toggle="site-navigation">
			<button class="menu-icon" type="button" data-toggle="mobile-menu"></button>
			<div class="title-bar-title">
				<a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a>
			</div>
		</div>

		<nav id="site-navigation" class="main-navigation top-bar" role="navigation">
			<div class="top-bar-left">
				<ul class="menu">
					<li class="home"><a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a></li>
				</ul>
			</div>
			<div class="top-bar-right">
				<?php foundationpress_top_bar_r(); ?>

				<?php if ( ! get_theme_mod( 'wpt_mobile_menu_layout' ) || get_theme_mod( 'wpt_mobile_menu_layout' ) == 'topbar' ) : ?>
					<?php get_template_part( 'template-parts/mobile-top-bar' ); ?>
				<?php endif; ?>
			</div>
		</nav>
	</header>


<ul class="dropdown menu desktop-menu">
	<?php $locations = get_nav_menu_locations(); ?>
	<?php if ( isset( $locations[ 'mega_menu' ] ) ) { ?>
		<?php $menu = get_term( $locations[ 'mega_menu' ], 'nav_menu' ); ?>
			<?php if ( $items = wp_get_nav_menu_items( $menu->name ) ) { ?>
				<?php foreach ( $items as $item ) { ?>
				<li class="wow">
					<a href="<?= $item->url ?>"><?= $item->title ?></a>
					<?php if ( is_active_sidebar( 'mega-menu-widget-area-' . $item->ID ) ) { ?>
						<div id="mega-menu-<?= $item->ID; ?>" class="mega-menu">
							Sheeet
							<?php dynamic_sidebar( 'mega-menu-widget-area-' . $item->ID ); ?>
						</div>
					<?php } ?>
				</li>
			<?php } ?>
		<?php } ?>
	<?php } ?>
</ul>


	<section class="container">
		<?php do_action( 'foundationpress_after_header' );
