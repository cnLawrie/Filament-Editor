export default class XmlToJson {
    xml: any;

    constructor() {}

    parse(xml: any) {
        this.setXml(xml);
        return this.convert(this.xml);
    }

    setXml(xml: any) {
        if (xml && typeof xml === "string") {
            this.xml = document.createElement("div");
            this.xml.innerHTML = xml;
            this.xml = this.xml.getElementsByTagName("*")[0];
        } else if (typeof xml === "object") {
            this.xml = xml;
        }
    }

    getXml() {
        return this.xml;
    }

    convert(xml: any) {
        if (xml.nodeType !== 1) {
            return null;
        }
        const obj: any = {};
        obj.xtype = xml.nodeName.toLowerCase();
        const nodeValue = (xml.textContent || "")
            .replace(/(\r|\n)/g, "")
            .replace(/^\s+|\s+$/g, "");

        if (nodeValue && xml.childNodes.length === 1) {
            obj.text = nodeValue;
        }
        if (xml.attributes.length > 0) {
            for (let j = 0; j < xml.attributes.length; j++) {
                const attribute = xml.attributes.item(j);
                obj[attribute.nodeName] = attribute.nodeValue;
            }
        }
        if (xml.childNodes.length > 0) {
            const items = [];
            for (let i = 0; i < xml.childNodes.length; i++) {
                const node = xml.childNodes.item(i);
                const item = this.convert(node);
                if (item) {
                    items.push(item);
                }
            }
            if (items.length > 0) {
                obj.items = items;
            }
        }
        return obj;
    }
}
