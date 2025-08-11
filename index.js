// index.js
require('dotenv').config(); // tambahkan di paling atas file index.js

const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionsBitField, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

// ==== KONFIGURASI ====
const TOKEN = process.env.TOKEN 
const GUILD_ID = '1375992174117781625'; // ID server
const LOG_CHANNEL_ID = '1402566633607925843'; // ID channel log
const CATEGORY_ID = '1378848556487671881'; // ganti ID category Transaksi
// =====================

// Penyimpanan sementara data ticket
const ticketData = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', async () => {
  console.log(`✅ Bot login sebagai ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.commands.create({
      name: 'calculate',
      description: 'Hitung jumlah Robux dari harga (IDR)',
      options: [
        {
          name: 'harga',
          description: 'Masukkan jumlah uang dalam IDR',
          type: 4,
          required: true
        }
      ]
    });
    console.log('✅ Slash command /calculate terdaftar.');
  } catch (err) {
    console.error('❌ Gagal mendaftar slash command:', err);
  }
});

// ====== Ticket Panel ======
client.on('messageCreate', async (message) => {
  if (message.content === '!ticketpanel') {
    const embed = new EmbedBuilder()
      .setTitle('Ticket Pembelian Robux')
      .setDescription(
        'Ingin membeli Robux? Klik tombol di bawah dan isi form.\n' +
        'Nominal = contoh: 100  •  Jenis = contoh: after tax\n\n' +
        'Untuk tutorial cara membuat gamepass dan perbedaan before tax / after tax ada di <#1402932755507056711>'
      )
      .setColor('#ff8058')
      .setImage('https://i.imgur.com/PqFWyjk.jpeg')
      .setFooter({ text: 'Support Bot • Isi form dengan data yang benar' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_ticket')
        .setLabel('🎫 Buat Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

// ====== Interaction Handler ======
client.on('interactionCreate', async (interaction) => {
  // Slash command /calculate
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'calculate') {
      const harga = interaction.options.getInteger('harga');
      const hargaPerRobux = 75;
      const jumlahRobux = Math.floor(harga / hargaPerRobux);

      return interaction.reply(
        `Jika anda membeli dengan harga **${harga.toLocaleString()} IDR**, maka anda akan mendapat **${jumlahRobux} Robux**`
      );
    }
    return;
  }

  // Tombol buka ticket
  if (interaction.isButton() && interaction.customId === 'open_ticket') {
    const modal = new ModalBuilder()
      .setCustomId('ticket_form')
      .setTitle('Form / Data Pembelian');

    const nominalInput = new TextInputBuilder()
      .setCustomId('nominal_robux')
      .setLabel('Nominal Robux')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: 100')
      .setRequired(true);

    const jenisInput = new TextInputBuilder()
      .setCustomId('jenis_robux')
      .setLabel('Jenis Robux')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: after tax')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nominalInput),
      new ActionRowBuilder().addComponents(jenisInput)
    );

    return interaction.showModal(modal);
  }

  // Tombol tutup ticket (log dikirim di sini)
  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: '❌ Hanya admin yang bisa menutup ticket ini.', ephemeral: true });
    }

    const data = ticketData.get(interaction.channel.id) || {};
    const closeEmbed = new EmbedBuilder()
      .setTitle('📤 Ticket Ditutup')
      .addFields(
        { name: 'User', value: data.userId ? `<@${data.userId}>` : 'Unknown', inline: true },
        { name: 'Nominal Robux', value: data.nominal || '-', inline: true },
        { name: 'Jenis Robux', value: data.jenis || '-', inline: true },
        { name: 'Channel', value: `${interaction.channel.name}`, inline: true },
        { name: 'Ditutup oleh', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setColor('#ff8058')
      .setTimestamp();

    try {
      const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel) await logChannel.send({ embeds: [closeEmbed] });
    } catch (err) {
      console.error('Gagal mengirim log:', err);
    }

    await interaction.reply({ content: '🔒 Ticket ditutup. Menghapus channel...', ephemeral: true });

    ticketData.delete(interaction.channel.id);
    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 2000);

    return;
  }

  // Modal submit (buat ticket tapi tanpa log)
  if (interaction.isModalSubmit() && interaction.customId === 'ticket_form') {
    const nominal = interaction.fields.getTextInputValue('nominal_robux');
    const jenis = interaction.fields.getTextInputValue('jenis_robux');

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    ticketData.set(ticketChannel.id, {
      userId: interaction.user.id,
      nominal,
      jenis,
      createdAt: new Date().toISOString()
    });

    const ticketEmbed = new EmbedBuilder()
      .setTitle('📩 Ticket Dibuka')
      .setDescription('Silakan jelaskan detail tambahan jika perlu. Admin akan merespon secepatnya.')
      .addFields(
        { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Nominal Robux', value: `${nominal}`, inline: true },
        { name: 'Jenis Robux', value: `${jenis}`, inline: true }
      )
      .setColor('#ff8058')
      .setTimestamp();

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ embeds: [ticketEmbed], components: [closeRow] });
    await interaction.reply({ content: `✅ Ticket dibuat: ${ticketChannel}`, ephemeral: true });
  }
});

client.login(TOKEN);

// ==== HTTP KEEPALIVE ====
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(3000, () => {
  console.log('HTTP server listening on port 3000');
})