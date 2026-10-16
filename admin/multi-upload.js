/**
 * Campo "multi-upload" per il pannello admin (Decap CMS).
 *
 * Permette di scegliere (o trascinare) PIU' immagini o PIU' file in una volta sola.
 * Il campo standard di Decap ne carica uno alla volta.
 *
 * I file vengono caricati con lo stesso meccanismo del campo standard: restano in
 * bozza e vengono salvati su GitHub insieme alla scheda quando si preme "Pubblica".
 * Nel file .json il valore e' una lista di percorsi, es. ["/incontri/a.jpg", "/incontri/b.jpg"].
 * Un vecchio valore singolo (testo) viene letto come lista di un elemento.
 *
 * Opzioni del campo in config.yml:
 *   widget: "multi-upload"
 *   accept: "image/*"            (oppure "application/pdf")
 *   media_folder / public_folder: cartella dove salvare e indirizzo pubblico
 */
(function () {
  if (!window.CMS || !window.h || !window.createClass) {
    console.error('[multi-upload] Decap CMS non trovato: il campo non e\' stato registrato.');
    return;
  }

  var h = window.h;
  var GOLD = '#c9a84c';
  var NAVY = '#0f2044';

  function baseName(p) {
    return String(p || '').split('/').pop();
  }

  function joinPublic(folder, name) {
    var f = String(folder || '/').replace(/\/+$/, '');
    return f + '/' + name;
  }

  // Decap tiene in bozza un solo file per ogni contenuto identico: se due file hanno
  // gli stessi byte, il secondo sostituirebbe il primo e un link resterebbe vuoto.
  // Per questo ricordiamo i file gia' caricati (contenuto -> indirizzo) e li riusiamo.
  var blobs = {}; // indirizzo pubblico -> anteprima locale del file appena scelto
  var seen = {};
  function resetSeen() { seen = {}; }
  window.addEventListener('hashchange', resetSeen);
  try {
    window.CMS.registerEventListener({ name: 'postSave', handler: resetSeen });
    window.CMS.registerEventListener({ name: 'postPublish', handler: resetSeen });
  } catch (e) {}

  function hashFile(file) {
    var fallback = 'f:' + file.size + ':' + file.name + ':' + file.lastModified;
    try {
      if (!window.crypto || !window.crypto.subtle || !file.arrayBuffer) return Promise.resolve(fallback);
      return file.arrayBuffer().then(function (buf) {
        return window.crypto.subtle.digest('SHA-256', buf);
      }).then(function (d) {
        return 'h:' + Array.prototype.map.call(new Uint8Array(d), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      }).catch(function () { return fallback; });
    } catch (e) {
      return Promise.resolve(fallback);
    }
  }

  var btnStyle = {
    display: 'inline-block',
    background: NAVY,
    color: '#fff',
    border: 0,
    borderRadius: '3px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer'
  };

  var linkBtnStyle = {
    background: 'none',
    border: 0,
    color: '#b3261e',
    cursor: 'pointer',
    fontSize: '13px',
    textDecoration: 'underline',
    padding: 0
  };

  var Control = window.createClass({
    getInitialState: function () {
      return { busy: false, done: 0, total: 0, error: '', note: '', over: false };
    },

    getList: function () {
      var v = this.props.value;
      if (!v) return [];
      if (v.toJS) v = v.toJS();
      if (typeof v === 'string') return [v];
      return Array.prototype.filter.call(v, Boolean);
    },

    isImage: function () {
      var accept = String(this.props.field.get('accept') || '');
      return accept.indexOf('image') === 0;
    },

    setList: function (list) {
      this.props.onChange(list.length ? list : null);
    },

    addFiles: function (fileList) {
      var self = this;
      var files = Array.prototype.slice.call(fileList || []);
      if (!files.length || this.state.busy) return Promise.resolve();

      var field = this.props.field;
      var publicFolder = field.get('public_folder') || field.get('media_folder') || '/';
      var list = this.getList();
      var added = 0;
      var failed = [];
      var reused = [];

      this.setState({ busy: true, done: 0, total: files.length, error: '', note: '' });

      // un file alla volta: evita conflitti e permette di mostrare l'avanzamento
      var chain = Promise.resolve();
      files.forEach(function (file) {
        chain = chain.then(function () {
          return hashFile(file).then(function (hash) {
            if (seen[hash]) {
              // stesso contenuto gia' caricato in questa bozza: si riusa il file esistente
              if (list.indexOf(seen[hash]) === -1) { list.push(seen[hash]); added++; }
              reused.push(file.name);
              return;
            }
            return Promise.resolve(self.props.onPersistMedia(file, { field: field }))
              .then(function (result) {
                var saved = result && result.payload && result.payload.path;
                if (saved) {
                  var pub = joinPublic(publicFolder, baseName(saved));
                  seen[hash] = pub;
                  if (list.indexOf(pub) === -1) list.push(pub);
                  try { blobs[pub] = URL.createObjectURL(file); } catch (e) {}
                  added++;
                } else if (result === undefined) {
                  // l'utente ha scelto di NON sostituire un file con lo stesso nome
                } else {
                  failed.push(file.name);
                }
              });
          })
            .catch(function () { failed.push(file.name); })
            .then(function () {
              self.setState({ done: self.state.done + 1 });
            });
        });
      });

      return chain.then(function () {
        if (added) self.setList(list.slice());
        self.setState({
          busy: false,
          error: failed.length ? 'Non caricati: ' + failed.join(', ') : '',
          note: reused.length
            ? 'Identici a file gia\' caricati (usato lo stesso file una sola volta): ' + reused.join(', ')
            : ''
        });
      });
    },

    onPick: function (e) {
      var input = e.target;
      var files = input.files;
      var p = this.addFiles(files);
      // permette di riscegliere gli stessi file
      Promise.resolve(p).then(function () { try { input.value = ''; } catch (err) {} });
    },

    onDrop: function (e) {
      e.preventDefault();
      this.setState({ over: false });
      if (e.dataTransfer && e.dataTransfer.files) this.addFiles(e.dataTransfer.files);
    },

    removeAt: function (i) {
      var list = this.getList();
      list.splice(i, 1);
      this.setList(list);
    },

    removeAll: function () {
      if (window.confirm('Rimuovere tutti i file da questo campo?\n(Non vengono cancellati dal sito finche\' non salvi.)')) {
        this.props.onChange(null);
      }
    },

    renderItem: function (path, i) {
      var self = this;
      var remove = h('button', {
        type: 'button',
        title: 'Rimuovi',
        onClick: function () { self.removeAt(i); },
        style: {
          position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px',
          borderRadius: '50%', border: 0, background: 'rgba(0,0,0,.65)', color: '#fff',
          cursor: 'pointer', fontSize: '14px', lineHeight: '24px', padding: 0
        }
      }, '✕');

      if (this.isImage()) {
        var src = blobs[path] || path;
        return h('div', {
          key: path,
          style: { position: 'relative', width: '110px', height: '82px', borderRadius: '3px', overflow: 'hidden', background: '#eee' }
        },
          h('img', { src: src, alt: baseName(path), style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } }),
          remove
        );
      }

      return h('div', {
        key: path,
        style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#f4f5f7', borderRadius: '3px' }
      },
        h('span', { style: { flex: 1, wordBreak: 'break-all', fontSize: '14px' } }, '📄 ' + baseName(path)),
        h('button', {
          type: 'button',
          onClick: function () { self.removeAt(i); },
          style: linkBtnStyle
        }, 'Rimuovi')
      );
    },

    render: function () {
      var self = this;
      var list = this.getList();
      var image = this.isImage();
      var accept = this.props.field.get('accept') || '';
      var noun = image ? ['immagine', 'immagini'] : ['file', 'file'];
      var st = this.state;

      var pickLabel = list.length
        ? '＋ Aggiungi altre ' + (image ? 'immagini' : 'file')
        : '＋ Scegli ' + (image ? 'una o più immagini' : 'uno o più file');

      var picker = h('label', { style: Object.assign({}, btnStyle, st.busy ? { opacity: 0.6, cursor: 'wait' } : {}) },
        pickLabel,
        h('input', {
          type: 'file',
          multiple: true,
          accept: accept,
          disabled: st.busy,
          onChange: this.onPick,
          style: { display: 'none' }
        })
      );

      var status = null;
      if (st.busy) {
        status = h('div', { style: { marginTop: '10px', fontSize: '14px', color: NAVY } },
          'Caricamento ' + Math.min(st.done + 1, st.total) + ' di ' + st.total + '…');
      } else if (list.length) {
        status = h('div', { style: { marginTop: '10px', fontSize: '13px', color: '#555', display: 'flex', gap: '14px', alignItems: 'center' } },
          h('span', null, list.length + ' ' + (list.length === 1 ? noun[0] : noun[1])),
          list.length > 1 ? h('button', { type: 'button', onClick: this.removeAll, style: linkBtnStyle }, 'Rimuovi tutti') : null
        );
      }

      var error = st.error
        ? h('div', { style: { marginTop: '8px', fontSize: '13px', color: '#b3261e' } }, st.error)
        : null;

      var note = st.note
        ? h('div', { style: { marginTop: '8px', fontSize: '13px', color: '#7a5b00' } }, st.note)
        : null;

      var items = list.length
        ? h('div', {
            style: image
              ? { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }
              : { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }
          }, list.map(function (p, i) { return self.renderItem(p, i); }))
        : null;

      return h('div', {
        className: this.props.classNameWrapper,
        onDragOver: function (e) { e.preventDefault(); if (!self.state.over) self.setState({ over: true }); },
        onDragLeave: function () { self.setState({ over: false }); },
        onDrop: this.onDrop,
        style: {
          border: '2px dashed ' + (st.over ? GOLD : '#c9ced6'),
          background: st.over ? '#fbf6e6' : 'transparent',
          borderRadius: '6px',
          padding: '14px'
        }
      },
        picker,
        h('span', { style: { marginLeft: '12px', fontSize: '13px', color: '#777' } }, 'oppure trascinali qui'),
        status,
        error,
        note,
        items
      );
    }
  });

  var Preview = window.createClass({
    render: function () {
      var v = this.props.value;
      if (v && v.toJS) v = v.toJS();
      var list = !v ? [] : (typeof v === 'string' ? [v] : v);
      return h('ul', null, list.map(function (p) { return h('li', { key: p }, baseName(p)); }));
    }
  });

  window.CMS.registerWidget('multi-upload', Control, Preview);
})();
