const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calculate')
        .setDescription('Hitung jumlah Robux dari harga IDR')
        .addIntegerOption(option =>
            option.setName('harga')
                .setDescription('Harga dalam IDR')
                .setRequired(true)
        ),
    async execute(interaction) {
        const harga = interaction.options.getInteger('harga');

        // Ganti 75 sesuai harga per Robux di server kamu
        const hargaPerRobux = 75; 
        const jumlahRobux = Math.floor(harga / hargaPerRobux);

        await interaction.reply(
            `Jika anda ingin membeli Robux dengan harga **${harga.toLocaleString()} IDR**, Robux yang anda dapatkan sebanyak **${jumlahRobux} Robux**`
        );
    },
};
