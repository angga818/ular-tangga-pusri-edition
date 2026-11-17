/**
 * Logical canvas size untuk papan Phaser.
 *
 * File ini sengaja tidak mengimpor Phaser supaya komponen React bisa
 * menetapkan `aspect-ratio` tanpa ikut memuat bundle Phaser (~1 MB).
 * Nilainya tetap sama seperti yang dipakai `BoardScene`.
 */
export const BOARD_WIDTH = 1200;
export const BOARD_HEIGHT = 896;
