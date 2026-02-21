import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { Player } from 'discord-player';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Crear un nuevo reproductor
const player = new Player(client);

// Agregar listeners básicos
player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`🎶 | Empezando a reproducir: **${track.title}** en **${queue.connection.channel.name}**!`);
});

player.events.on('audioTrackAdd', (queue, track) => {
    queue.metadata.channel.send(`🎶 | Pista **${track.title}** añadida a la cola!`);
});

player.events.on('disconnect', (queue) => {
    queue.metadata.channel.send('❌ | Fui desconectado del canal de voz. Vaciando la cola...');
});

player.events.on('emptyChannel', (queue) => {
    queue.metadata.channel.send('❌ | El canal de voz está vacío, saliendo del canal...');
});

player.events.on('emptyQueue', (queue) => {
    queue.metadata.channel.send('✅ | La cola ha terminado.');
});

player.events.on('error', (queue, error) => {
    console.log(`[Error de Cola] ${error.message}`);
    queue.metadata.channel.send('❌ | Ocurrió un error al reproducir la música.');
});

client.on('ready', async () => {
    console.log(`¡Logeado como ${client.user.tag}!`);
    // Extraer extractores por defecto (YouTube, Spotify, SoundCloud, etc)
    await player.extractors.loadDefault();
});

const PREFIX = '!';

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play' || command === 'p') {
        if (!args.length) return message.reply('❌ | Por favor ingresa una búsqueda o URL.');
        if (!message.member.voice.channel) return message.reply('❌ | ¡Necesitas estar en un canal de voz!');

        const query = args.join(' ');
        
        try {
            const { track } = await player.play(message.member.voice.channel, query, {
                nodeOptions: {
                    metadata: {
                        channel: message.channel,
                        client: message.guild.members.me
                    },
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 300000,
                }
            });
            
            return message.reply(`⏳ | Cargando tu pista...`);
        } catch (e) {
            console.error(e);
            return message.reply(`❌ | Algo salió mal buscando la canción.`);
        }
    }

    if (command === 'skip' || command === 's') {
        const queue = player.nodes.get(message.guild);
        if (!queue || !queue.isPlaying()) return message.reply('❌ | No se está reproduciendo música actualmente.');
        
        queue.node.skip();
        return message.reply('⏭️ | Pista saltada.');
    }

    if (command === 'stop') {
        const queue = player.nodes.get(message.guild);
        if (!queue || !queue.isPlaying()) return message.reply('❌ | No se está reproduciendo música actualmente.');
        
        queue.delete();
        return message.reply('🛑 | Música detenida y cola vaciada.');
    }

    if (command === 'queue' || command === 'q') {
        const queue = player.nodes.get(message.guild);
        if (!queue || !queue.isPlaying()) return message.reply('❌ | No se está reproduciendo música actualmente.');

        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray().slice(0, 10).map((t, i) => `${i + 1}. **${t.title}**`);
        
        const queueString = tracks.length 
            ? `\n\n**Próximas pistas:**\n${tracks.join('\n')}${queue.tracks.size > 10 ? `\n... y ${queue.tracks.size - 10} más` : ''}` 
            : '';

        return message.reply(`🎶 | **Reproduciendo ahora:** ${currentTrack.title}${queueString}`);
    }
    
    if (command === 'pause') {
        const queue = player.nodes.get(message.guild);
        if (!queue || !queue.isPlaying()) return message.reply('❌ | No se está reproduciendo música actualmente.');
        
        queue.node.setPaused(!queue.node.isPaused());
        return message.reply(queue.node.isPaused() ? '⏸️ | Música pausada.' : '▶️ | Música reanudada.');
    }
});

client.login(process.env.DISCORD_TOKEN);