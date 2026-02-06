
export const maskDocument = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');

    if (cleanValue.length <= 11) {
        // CPF Mask: 000.000.000-00
        return cleanValue
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    } else {
        // CNPJ Mask: 00.000.000/0000-00
        return cleanValue
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    }
};

export const maskPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');

    if (cleanValue.length <= 10) {
        // (00) 0000-0000
        return cleanValue
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    } else {
        // (00) 00000-0000
        return cleanValue
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    }
};
