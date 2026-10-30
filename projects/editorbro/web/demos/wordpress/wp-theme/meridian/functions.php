<?php
/**
 * Meridian block theme: loads the Google Fonts named in theme.json and the theme stylesheet.
 *
 * @package meridian
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MERIDIAN_FONTS_URL', 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap' );

add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_style( 'meridian-fonts', MERIDIAN_FONTS_URL, array(), null );
		wp_enqueue_style( 'meridian-style', get_stylesheet_uri(), array(), wp_get_theme()->get( 'Version' ) );
	}
);

add_action(
	'after_setup_theme',
	function () {
		add_editor_style( array( MERIDIAN_FONTS_URL, 'style.css' ) );
	}
);
